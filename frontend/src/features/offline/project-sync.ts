import { type ProjectApi, object, objectId, type Json } from './api/project-api';
export {ProjectApi} from './api/project-api';
import { compatibleEngine, DataError, ENGINE_VERSION, importCsv, mapOriginalIds, type Snapshot, type ProcessingSpecification, type CsvOptions } from '@dashboard/data-core';
import { projectLock, projectStore, type LocalProject } from './project-store';
import { SyncHttpError } from './types';

import type { Preview, PreviewPage } from '../processing';
import { previewCandidate } from './preview-candidate';
import { assertOriginalSource } from './project-backup';
import { publishProjectProgress } from './project-events';

export async function createLocalProject(file:File,name:string,importOptions:CsvOptions={delimiter:','},creationId:string=crypto.randomUUID()):Promise<LocalProject>{
  const projectName=name.trim()||file.name;
  if(Array.from(projectName).length>100)throw new Error('Tên project tối đa 100 ký tự');
  if(file.size>16_000_000)throw new Error('CSV vượt 16.000.000 byte');
  const source=new Uint8Array(await file.arrayBuffer());
  const sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source))).map(v=>v.toString(16).padStart(2,'0')).join('');
  return projectLock(creationId,async()=>{
    const existing=await projectStore.load(creationId);
    if(existing){if(existing.sourceHash!==sourceHash||JSON.stringify(existing.importOptions??{delimiter:','})!==JSON.stringify(importOptions)||existing.name!==projectName)throw new Error('Logical import đã lưu với nội dung khác; chọn lại file để bắt đầu import mới');return existing;}
    const original=importCsv(source,importOptions,()=>crypto.randomUUID());
    const project:LocalProject={id:creationId,name:projectName,fileName:file.name,source,sourceHash,importOptions,original,snapshot:original,engineVersion:ENGINE_VERSION,operations:[],createKey:crypto.randomUUID(),importKey:crypto.randomUUID(),cursor:0,status:'local'};
    await projectStore.save(project);return project;
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
  // Surviving IDs retain identity even when duplicate rows could otherwise map by position.
  for(const [id,target]of Object.entries(mapping.rows))if(project.mapping?.rows[id]&&project.mapping.rows[id]!==target)throw new SyncHttpError(409,'SYNC_MAPPING_CONFLICT','Row ID thay đổi ngoài hợp đồng');
  for(const [id,target]of Object.entries(mapping.columns))if(project.mapping?.columns[id]&&project.mapping.columns[id]!==target)throw new SyncHttpError(409,'SYNC_MAPPING_CONFLICT','Column ID thay đổi ngoài hợp đồng');
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
      api.bindOwner(objectId(me._id));
      if(project.accountId&&project.accountId!==me._id)throw new SyncHttpError(403,'SYNC_ACCOUNT_MISMATCH','Đăng nhập đúng tài khoản đã gắn với dữ liệu này');
      if(!compatibleEngine(project.engineVersion,ENGINE_VERSION))throw new SyncHttpError(409,'SYNC_ENGINE_MISMATCH','Engine đã thay đổi; giữ nguyên dữ liệu local');
      if(!project.datasetId)try{await assertOriginalSource(project);}catch(error){throw new SyncHttpError(413,error instanceof Error?error.message:'LOCAL_SOURCE_MISSING','CSV nguồn bị thiếu hoặc không khớp; chọn lại file nguồn trước khi đồng bộ');}
      project.accountId=objectId(me._id);project.status='syncing';delete project.error;delete project.syncRetry;delete project.retryAfterMs;await projectStore.save(project);
      if(!project.projectId){const result=await api.post('projects',{name:project.name},project.createKey);project.projectId=objectId(object(result.project)._id);await projectStore.save(project);}
      if(!project.datasetId){
        const form=new FormData();form.set('importOptions',JSON.stringify(project.importOptions??{}));form.set('file',new Blob([new Uint8Array(project.source)],{type:'text/csv'}),project.fileName);
        const result=await api.request(`projects/${project.projectId}/datasets`,{method:'POST',headers:{'Idempotency-Key':project.importKey},body:form});
        project.datasetId=objectId(object(result.dataset)._id);project.serverVersionId=objectId(object(result.version)._id);project.importVersionId=project.serverVersionId;await projectStore.save(project);
      }
      const remote=async()=>object((await api.request(`projects/${project.projectId}`)).dataset);
      const verifyHead=async(expected:string)=>{const state=await remote();if(state._id!==project.datasetId||state.currentVersionId!==expected)throw new SyncHttpError(409,'BASE_VERSION_STALE','Server đã đổi phiên bản; giữ bản local');return state;};
      if(!project.mapping){const state=await verifyHead(project.serverVersionId!);const snapshot=await api.snapshot(project.datasetId!,project.serverVersionId!);project.mapping=verifyMapping(project.original,snapshot,project,String(object(state.originalFile).sha256));await projectStore.save(project);}
      while(project.cursor<project.operations.length){
        const operation=project.operations[project.cursor];
        if(project.restoredBackup&&operation.kind==='process'&&operation.phase==='apply-sent'&&operation.previewId){
          // An imported file cannot assert that an Apply was sent. If its preview
          // is still ready, recheck the entire candidate before any publication.
          try{const view=await api.request(`datasets/${project.datasetId}/previews/${operation.previewId}?page=1&limit=100`) as unknown as PreviewPage;if(view.preview.status==='ready')operation.phase='preview-sent';}
          catch(error){if(!(error instanceof SyncHttpError&&[404,410].includes(error.status)))throw error;}
        }
        // A sent Apply may already have committed: replay its receipt before checking stale head.
        if(operation.phase!=='apply-sent')await verifyHead(project.serverVersionId!);
        if(operation.kind==='process'&&(operation.phase==='queued'||operation.phase==='preview-sent')){
          try{
          operation.serverSpecification??=mappedSpec(operation.specification,project);operation.phase='preview-sent';await projectStore.save(project);
          const result=await api.post(`datasets/${project.datasetId}/previews`,{baseVersionId:project.serverVersionId,specification:operation.serverSpecification},operation.previewKey);
          if(!compatibleEngine(String(result.engineVersion),project.engineVersion,operation.specification.method)||result.canApply!==true||result.status!=='ready')throw new SyncHttpError(409,'SYNC_PREVIEW_MISMATCH','Preview server khác kết quả offline');
          const previewId=objectId(result.previewId);
          const base=await api.snapshot(project.datasetId!,project.serverVersionId!);
          const changes:PreviewPage['changes']=[];let total:number|undefined;
          for(let page=1;total===undefined||changes.length<total;page++){
            const view=await api.request(`datasets/${project.datasetId}/previews/${previewId}?page=${page}&limit=100`) as unknown as PreviewPage;
            if(view.preview.previewId!==previewId||view.preview.baseVersionId!==project.serverVersionId||!compatibleEngine(view.preview.engineVersion,project.engineVersion,operation.specification.method)||view.preview.specHash!==result.specHash||view.preview.status!=='ready'||!view.preview.canApply||Date.parse(view.preview.expiresAt)<=Date.now()||!Number.isSafeInteger(view.totalChanges)||view.totalChanges<0||!Array.isArray(view.changes)||view.page!==page||total!==undefined&&total!==view.totalChanges)throw new SyncHttpError(409,'SYNC_PREVIEW_MISMATCH','Preview đã đổi hoặc hết hạn; chưa Apply');
            total=view.totalChanges;
            if(changes.length+view.changes.length>total||changes.length<total&&!view.changes.length)throw new SyncHttpError(409,'SYNC_PREVIEW_MISMATCH','Preview thiếu trang thay đổi; chưa Apply');
            changes.push(...view.changes);
          }
          const candidate=previewCandidate(base,result as unknown as Preview,changes);
          // Validate contents/lineage/identity BEFORE publishing; retain mapping only after receipt.
          verifyMapping(operation.snapshot,candidate,project,project.sourceHash);
          await verifyHead(project.serverVersionId!);
          operation.previewId=previewId;operation.phase='apply-sent';await projectStore.save(project);
          }catch(error){
            // No Apply was sent in this phase. A terminal missing/expired preview
            // can be replaced only after confirming that the base still exists.
            if(operation.phase!=='apply-sent'&&error instanceof SyncHttpError&&[404,410].includes(error.status)){
              await verifyHead(project.serverVersionId!);
              operation.phase='queued';operation.previewId=undefined;operation.previewKey=crypto.randomUUID();
              await projectStore.save(project);
            }
            throw error;
          }
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
      await verifyHead(project.serverVersionId!);project.status='synced';delete project.restoredBackup;
    }catch(error){
      project.error=error instanceof SyncHttpError||error instanceof DataError?error.code:error instanceof Error?error.message:'NETWORK_OR_UNKNOWN_COMMIT';
      if(error instanceof SyncHttpError&&error.retryAfter!==undefined)project.retryAfterMs=error.retryAfter;else delete project.retryAfterMs;
      project.status=error instanceof DataError?'conflict':error instanceof SyncHttpError?[401,403,404,413].includes(error.status)?'blocked':error.status===409&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code)?'conflict':'retry':'retry';
    }
    try{await projectStore.save(project);}catch(error){
      const durable=await projectStore.load(id);if(durable)publishProjectProgress({...durable,status:'retry',error:'LOCAL_CHECKPOINT_UNSAVED'});
      throw error;
    }return project;
  });
}
