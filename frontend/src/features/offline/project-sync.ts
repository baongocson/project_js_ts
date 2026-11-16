import { DataError, ENGINE_VERSION, importCsv, mapOriginalIds, processSnapshot, type Snapshot, type Column, type ProcessingSpecification } from '@dashboard/data-core';
import { projectLock, projectStore, type LocalProject } from './project-store';
import { SyncHttpError } from './types';

const base=(import.meta.env.VITE_API_BASE_URL||'/api/v1').replace(/\/$/,'');
type Json=Record<string,unknown>;
function object(value:unknown):Json{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('SERVER_RESPONSE_INVALID');return value as Json;}
function objectId(value:unknown):string{if(typeof value!=='string'||! /^[a-f0-9]{24}$/i.test(value))throw new Error('SERVER_RECEIPT_ID_INVALID');return value.toLowerCase();}
export class ProjectApi {
  constructor(private readonly token:()=>string){}
  async request(path:string,options:RequestInit={}):Promise<Json>{
    const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${this.token()}`);
    const response=await fetch(`${base}/${path}`,{...options,headers});
    const data:unknown=await response.json().catch(()=>({}));
    if(!response.ok){const error=object(object(data).error??data);throw new SyncHttpError(response.status,String(error.code??response.status),String(error.message??response.status));}
    return object(data);
  }
  post(path:string,body:unknown,key:string){return this.request(path,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});}
  async snapshot(dataset:string,version:string):Promise<Snapshot>{
    const meta=await this.request(`datasets/${dataset}/versions/${version}`);
    const rows:Snapshot['rows']=[];let total:number|undefined;
    for(let page=1;total===undefined||rows.length<total;page++){
      const result=await this.request(`datasets/${dataset}/versions/${version}/rows?page=${page}&limit=100`);
      if(!Array.isArray(result.rows)||!Number.isSafeInteger(result.totalRows))throw new Error('SERVER_ROWS_INVALID');
      if(total!==undefined&&total!==result.totalRows)throw new Error('SERVER_ROWS_CHANGED');
      total=Number(result.totalRows);
      if(total>rows.length&&!result.rows.length)throw new Error('SERVER_ROWS_INCOMPLETE');
      rows.push(...result.rows as Snapshot['rows']);
    }
    return {columns:meta.columns as Column[],rows};
  }
}
export async function createLocalProject(file:File,name:string):Promise<LocalProject>{
  const projectName=name.trim()||file.name;
  if(Array.from(projectName).length>100)throw new Error('Tên project tối đa 100 ký tự');
  if(file.size>16_000_000)throw new Error('CSV vượt 16.000.000 byte');
  const source=new Uint8Array(await file.arrayBuffer());
  const sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const original=importCsv(source,{delimiter:','},()=>crypto.randomUUID());
  const project:LocalProject={id:crypto.randomUUID(),name:projectName,fileName:file.name,source,sourceHash,original,snapshot:original,engineVersion:ENGINE_VERSION,operations:[],createKey:crypto.randomUUID(),importKey:crypto.randomUUID(),cursor:0,status:'local'};
  await projectStore.save(project);return project;
}
export async function editLocalProject(id:string,specification:ProcessingSpecification):Promise<LocalProject>{
  return projectLock(id,async()=>{
    const project=await projectStore.load(id);if(!project)throw new Error('LOCAL_PROJECT_NOT_FOUND');
    if(project.status==='syncing')throw new Error('Đang đồng bộ; hãy đợi hoàn tất');
    if(project.engineVersion!==ENGINE_VERSION)throw new Error('SYNC_ENGINE_MISMATCH');
    const result=processSnapshot(project.snapshot,specification);
    if(result.errors.length)throw new Error(result.errors.map(error=>error.code).join(', '));
    if(!result.canApply)throw new Error('Không có thay đổi');
    project.operations.push({kind:'process',id:crypto.randomUUID(),specification,snapshot:result.snapshot,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),phase:'queued'});
    project.snapshot=result.snapshot;project.status='local';await projectStore.save(project);return project;
  });
}
export async function restoreLocalProject(id:string,target:number):Promise<LocalProject>{
  return projectLock(id,async()=>{
    const project=await projectStore.load(id);if(!project)throw new Error('LOCAL_PROJECT_NOT_FOUND');
    if(!Number.isSafeInteger(target)||target<0||target>=project.operations.length)throw new Error('Chọn một phiên bản trước phiên bản hiện tại');
    const snapshot=structuredClone(target===0?project.original:project.operations[target-1].snapshot);
    project.operations.push({kind:'restore',target,id:crypto.randomUUID(),snapshot,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),phase:'queued'});
    project.snapshot=snapshot;project.status='local';await projectStore.save(project);return project;
  });
}
function mappedSpec(spec:ProcessingSpecification,project:LocalProject):ProcessingSpecification{
  const mapping=project.mapping!;
  const column=(id:string)=>{const result=mapping.columns[id];if(!result)throw new Error('SYNC_MAPPING_REQUIRED');return result;};
  const row=(id:string)=>{const result=mapping.rows[id];if(!result)throw new Error('SYNC_MAPPING_REQUIRED');return result;};
  const scope=spec.scope.type==='cell'?{type:'cell' as const,rowId:row(spec.scope.rowId),columnId:column(spec.scope.columnId)}:spec.scope.type==='columns'?{type:'columns' as const,columnIds:spec.scope.columnIds.map(column)}:{type:'dataset' as const};
  return {...spec,scope};
}
function verifyMapping(local:Snapshot,remote:Snapshot,project:LocalProject,hash:string){
  const mapping=mapOriginalIds(local,remote,{localSourceHash:project.sourceHash,serverSourceHash:hash,sameImportOptions:true});
  for(const column of local.columns){
    if(!column.lineage)continue;
    const other=remote.columns.find(item=>item.columnId===mapping.columns[column.columnId]);
    const expectedSource=mapping.columns[column.lineage.sourceColumnId]??project.mapping?.columns[column.lineage.sourceColumnId];
    if(!other?.lineage||other.lineage.sourceColumnId!==expectedSource||JSON.stringify(other.lineage.category)!==JSON.stringify(column.lineage.category))throw new SyncHttpError(409,'SYNC_MAPPING_CONFLICT','Lineage cột encoding không khớp');
  }
  return {columns:{...project.mapping?.columns,...mapping.columns},rows:{...project.mapping?.rows,...mapping.rows}};
}
export async function syncLocalProject(id:string,api:ProjectApi):Promise<LocalProject>{
  return projectLock(id,async()=>{
    const project=await projectStore.load(id);if(!project)throw new Error('LOCAL_PROJECT_NOT_FOUND');
    try{
      const me=await api.request('users/me');
      if(project.accountId&&project.accountId!==me._id)throw new SyncHttpError(403,'SYNC_ACCOUNT_MISMATCH','Đăng nhập đúng tài khoản đã gắn với dữ liệu này');
      if(project.engineVersion!==ENGINE_VERSION)throw new SyncHttpError(409,'SYNC_ENGINE_MISMATCH','Engine đã thay đổi; giữ nguyên dữ liệu local');
      project.accountId=objectId(me._id);project.status='syncing';delete project.error;await projectStore.save(project);
      if(!project.projectId){const result=await api.post('projects',{name:project.name},project.createKey);project.projectId=objectId(object(result.project)._id);await projectStore.save(project);}
      if(!project.datasetId){
        const form=new FormData();form.set('importOptions','{}');form.set('file',new Blob([new Uint8Array(project.source)],{type:'text/csv'}),project.fileName);
        const result=await api.request(`projects/${project.projectId}/datasets`,{method:'POST',headers:{'Idempotency-Key':project.importKey},body:form});
        project.datasetId=objectId(object(result.dataset)._id);project.serverVersionId=objectId(object(result.version)._id);project.importVersionId=project.serverVersionId;await projectStore.save(project);
      }
      const remote=async()=>object((await api.request(`projects/${project.projectId}`)).dataset);
      const verifyHead=async(expected:string)=>{const state=await remote();if(state._id!==project.datasetId||state.currentVersionId!==expected)throw new SyncHttpError(409,'BASE_VERSION_STALE','Server đã đổi phiên bản; giữ bản local');return state;};
      if(!project.mapping){const state=await verifyHead(project.serverVersionId!);const snapshot=await api.snapshot(project.datasetId!,project.serverVersionId!);project.mapping=verifyMapping(project.original,snapshot,project,String(object(state.originalFile).sha256));await projectStore.save(project);}
      while(project.cursor<project.operations.length){
        const operation=project.operations[project.cursor];
        // A sent Apply may already have committed: replay its receipt before checking stale head.
        if(operation.phase!=='apply-sent')await verifyHead(project.serverVersionId!);
        if(operation.kind==='process'&&(operation.phase==='queued'||operation.phase==='preview-sent')){
          operation.serverSpecification??=mappedSpec(operation.specification,project);operation.phase='preview-sent';await projectStore.save(project);
          const result=await api.post(`datasets/${project.datasetId}/previews`,{baseVersionId:project.serverVersionId,specification:operation.serverSpecification},operation.previewKey);
          if(result.engineVersion!==project.engineVersion||result.canApply!==true||result.status!=='ready')throw new SyncHttpError(409,'SYNC_PREVIEW_MISMATCH','Preview server khác kết quả offline');
          operation.previewId=objectId(result.previewId);operation.phase='apply-sent';await projectStore.save(project);
        }
        let version:string;
        if(operation.kind==='restore'){
          const target=operation.target===0?project.importVersionId:project.operations[operation.target-1].resultVersionId;
          if(!target)throw new Error('SYNC_MAPPING_REQUIRED');
          operation.phase='apply-sent';await projectStore.save(project);
          const result=await api.post(`datasets/${project.datasetId}/versions/${target}/restore`,{expectedCurrentVersionId:project.serverVersionId},operation.applyKey);
          version=objectId(object(result.newVersion)._id);
        }else{
          let result:Json;
          try{result=await api.post(`datasets/${project.datasetId}/operations`,{previewId:operation.previewId},operation.applyKey);}
          catch(error){
            // A terminal reply to the ORIGINAL Apply key confirms that attempt did
            // not commit. Only then may a new preview/key be created on the same head.
            if(error instanceof SyncHttpError&&[404,410].includes(error.status)){
              await verifyHead(project.serverVersionId!);
              operation.phase='queued';operation.previewId=undefined;operation.previewKey=crypto.randomUUID();operation.applyKey=crypto.randomUUID();
              await projectStore.save(project);
            }
            throw error;
          }
          version=objectId(object(result.dataset).currentVersionId);
        }
        const state=await verifyHead(version),snapshot=await api.snapshot(project.datasetId!,version);
        project.mapping=verifyMapping(operation.snapshot,snapshot,project,String(object(state.originalFile).sha256));
        operation.resultVersionId=version;operation.phase='confirmed';project.serverVersionId=version;project.cursor++;await projectStore.save(project);
      }
      await verifyHead(project.serverVersionId!);project.status='synced';
    }catch(error){
      project.error=error instanceof SyncHttpError||error instanceof DataError?error.code:error instanceof Error?error.message:'NETWORK_OR_UNKNOWN_COMMIT';
      project.status=error instanceof DataError?'conflict':error instanceof SyncHttpError?[401,403,404,413].includes(error.status)?'blocked':error.status===409&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code)?'conflict':'retry':'retry';
    }
    await projectStore.save(project);return project;
  });
}
