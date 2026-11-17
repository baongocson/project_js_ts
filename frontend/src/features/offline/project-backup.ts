import { compatibleEngine, ENGINE_VERSION,encodeSnapshot,importCsv,mapOriginalIds,processSnapshot,sameCell,type Snapshot } from '@dashboard/data-core';
import { projectLock,projectStore,type LocalProject } from './project-store';
import { makeSpecification } from '../processing';

export async function sourceHash(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(value=>value.toString(16).padStart(2,'0')).join('');}
export function hasOriginalSource(project:LocalProject){return project.source instanceof Uint8Array&&project.source.byteLength>0;}
export async function assertOriginalSource(project:LocalProject){
  if(!hasOriginalSource(project))throw new Error('LOCAL_SOURCE_MISSING');
  if(await sourceHash(project.source)!==project.sourceHash)throw new Error('LOCAL_SOURCE_MISMATCH');
}
export async function recoverOriginalSource(id:string,file:File){
  if(file.size>16_000_000)throw new Error('CSV vượt 16.000.000 byte');
  const bytes=new Uint8Array(await file.arrayBuffer()),hash=await sourceHash(bytes);
  return projectLock(id,async()=>{
    const project=await projectStore.load(id);if(!project)throw new Error('Không tìm thấy project local');
    if(hash!==project.sourceHash)throw new Error('File không khớp SHA-256 nguồn gốc; bản local được giữ nguyên');
    const parsed=importCsv(bytes,project.importOptions??{delimiter:','},()=>crypto.randomUUID());
    mapOriginalIds(parsed,project.original,{localSourceHash:hash,serverSourceHash:project.sourceHash,sameImportOptions:true});
    project.source=bytes;delete project.error;project.status='local';await projectStore.save(project);return project;
  });
}
const fields=['id','name','fileName','sourceHash','importOptions','original','snapshot','engineVersion','operations','createKey','importKey','accountId','projectId','datasetId','serverVersionId','importVersionId','mapping','cursor','status','error'] as const;
export function backupProject(project:LocalProject){
  const record=Object.fromEntries(fields.filter(key=>project[key]!==undefined).map(key=>[key,project[key]]));
  const bytes=hasOriginalSource(project)?project.source:undefined;
  let binary='';if(bytes)for(let index=0;index<bytes.length;index+=16_384)binary+=String.fromCharCode(...bytes.subarray(index,index+16_384));
  return JSON.stringify({format:'data-workspace-backup',schema:1,exportedAt:new Date().toISOString(),project:record,sourceBase64:bytes?btoa(binary):null});
}
function invalid():never{throw new Error('Backup không hợp lệ; chưa thay đổi dữ liệu trên máy');}
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const objectId=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{24}$/i.test(value);
function canonical(value:unknown):string{if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;return JSON.stringify(value)??'undefined';}
function sameSnapshot(a:Snapshot,b:Snapshot){return canonical(a.columns)===canonical(b.columns)&&a.rows.length===b.rows.length&&a.rows.every((row,index)=>{const other=b.rows[index];return row.rowId===other.rowId&&row.position===other.position&&a.columns.every(column=>sameCell(row.cells[column.columnId],other.cells[column.columnId])&&row.cells[column.columnId].rawToken===other.cells[column.columnId].rawToken);});}
export async function parseProjectBackup(text:string):Promise<LocalProject>{
  let envelope:{format?:string;schema?:number;sourceBase64?:string|null;project?:LocalProject};try{envelope=JSON.parse(text) as typeof envelope;}catch{invalid();}
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||envelope.format!=='data-workspace-backup'||envelope.schema!==1||!envelope.project||typeof envelope.project!=='object'||Array.isArray(envelope.project))invalid();
  const value=envelope.project;
  if(Object.keys(value).some(key=>!fields.includes(key as typeof fields[number]))||!uuid(value.id)||typeof value.name!=='string'||!value.name.trim()||[...value.name].length>100||typeof value.fileName!=='string'||typeof value.engineVersion!=='string'||!value.engineVersion||typeof value.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(value.sourceHash)||!uuid(value.createKey)||!uuid(value.importKey)||value.createKey===value.importKey||!Array.isArray(value.operations)||!Number.isSafeInteger(value.cursor)||value.cursor<0||value.cursor>value.operations.length)invalid();
  for(const key of ['accountId','projectId','datasetId','serverVersionId','importVersionId'] as const)if(value[key]!==undefined&&!objectId(value[key]))invalid();
  if(value.error!==undefined&&typeof value.error!=='string')invalid();
  if(value.datasetId&&(!value.projectId||!value.accountId||!value.serverVersionId||!value.importVersionId)||!value.datasetId&&(value.mapping!==undefined||value.serverVersionId!==undefined||value.importVersionId!==undefined))invalid();
  if(value.importOptions!==undefined){if(!value.importOptions||typeof value.importOptions!=='object'||Array.isArray(value.importOptions)||Object.keys(value.importOptions).some(key=>!['delimiter','columnTypes'].includes(key))||![',',';','\t'].includes(value.importOptions.delimiter))invalid();}
  function snapshot(snapshot:Snapshot){try{encodeSnapshot(snapshot);}catch{invalid();}}
  snapshot(value.original);snapshot(value.snapshot);
  const keys=new Set<string>([value.createKey,value.importKey]),ids=new Set<string>();
  value.operations.forEach((operation,index)=>{
    if(Object.keys(operation).some(key=>!['id','snapshot','previewKey','applyKey','phase','previewId','resultVersionId','kind','specification','serverSpecification','target'].includes(key)))invalid();
    if(!uuid(operation.id)||ids.has(operation.id)||!uuid(operation.previewKey)||!uuid(operation.applyKey)||keys.has(operation.previewKey)||keys.has(operation.applyKey)||operation.previewKey===operation.applyKey||!['queued','preview-sent','apply-sent','confirmed'].includes(operation.phase)||index<value.cursor&&(operation.phase!=='confirmed'||!objectId(operation.resultVersionId))||index>=value.cursor&&operation.phase==='confirmed')invalid();
    ids.add(operation.id);keys.add(operation.previewKey);keys.add(operation.applyKey);snapshot(operation.snapshot);
    if(operation.kind==='restore'){if(!Number.isSafeInteger(operation.target)||operation.target<0||operation.target>=index)invalid();}
    else if(operation.kind!=='process'||!operation.specification||typeof operation.specification.method!=='string'||!operation.specification.scope||!operation.specification.parameters)invalid();
    else {makeSpecification(operation.specification.method,operation.specification.parameters as Record<string,unknown>,operation.specification.scope);delete operation.serverSpecification;}
    if(compatibleEngine(value.engineVersion,ENGINE_VERSION)){
      const base=index===0?value.original:value.operations[index-1].snapshot;
      if(operation.kind==='process'){const evaluated=processSnapshot(base,operation.specification);if(evaluated.errors.length||!evaluated.canApply||!sameSnapshot(evaluated.snapshot,operation.snapshot))invalid();}
      else if(!sameSnapshot(operation.snapshot,operation.target===0?value.original:value.operations[operation.target-1].snapshot))invalid();
    }
  });
  if(!sameSnapshot(value.snapshot,value.operations.at(-1)?.snapshot??value.original))invalid();
  if(value.cursor>0&&(!value.accountId||!value.datasetId||!value.serverVersionId||!value.mapping))invalid();
  if(value.datasetId&&value.serverVersionId!==(value.cursor?value.operations[value.cursor-1].resultVersionId:value.importVersionId))invalid();
  if(value.mapping!==undefined){if(!value.mapping||typeof value.mapping!=='object'||Object.keys(value.mapping).some(key=>!['rows','columns'].includes(key)))invalid();for(const mapping of [value.mapping.rows,value.mapping.columns]){if(!mapping||typeof mapping!=='object'||Object.entries(mapping).some(([key,target])=>!uuid(key)||!uuid(target)))invalid();}}
  let bytes=new Uint8Array();
  if(envelope.sourceBase64!==null){if(typeof envelope.sourceBase64!=='string')invalid();let decoded:string;try{decoded=atob(envelope.sourceBase64);}catch{invalid();}bytes=Uint8Array.from(decoded,char=>char.charCodeAt(0));if(bytes.length>16_000_000||await sourceHash(bytes)!==value.sourceHash)invalid();
    const parsed=importCsv(bytes,value.importOptions??{delimiter:','},()=>crypto.randomUUID());mapOriginalIds(parsed,value.original,{localSourceHash:value.sourceHash,serverSourceHash:value.sourceHash,sameImportOptions:true});
  }
  return {...value,source:bytes,status:'local',restoredBackup:true};
}
export async function importProjectBackup(file:File){
  const project=await parseProjectBackup(await file.text());
  return projectLock(project.id,async()=>{if(await projectStore.load(project.id))throw new Error('Project này đã tồn tại; không ghi đè bản local. Hãy giữ cả backup để đối chiếu');await projectStore.save(project);return project;});
}
export function downloadFile(name:string,content:BlobPart,type:string){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
