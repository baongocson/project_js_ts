import { compatibleEngine, cellKey,ENGINE_VERSION,missingKind,processSnapshot,projectPreview,sameCell,type Snapshot } from '@dashboard/data-core';
import type { ProcessingAdapter,Preview,PreviewChange } from '../../processing';
import { PreviewRejected } from '../../processing';
import { projectLock,projectStore,type LocalProject } from '../repositories/project-store';
export const localVersion=(project:LocalProject)=>project.operations.at(-1)?.id??'original';
export function localProcessing(projectId:string,expectedVersion?:string):ProcessingAdapter{
  const previews=new Map<string,{preview:Preview;baseVersion:string;specification:Parameters<ProcessingAdapter['preview']>[0];snapshot:Snapshot;changes:PreviewChange[]}>();
  const keys=new Map<string,string>();
  async function load(){const project=await projectStore.load(projectId);if(!project)throw new Error('Không tìm thấy project local');if(!compatibleEngine(project.engineVersion,ENGINE_VERSION))throw new Error('SYNC_ENGINE_MISMATCH');return project;}
  return {
    preview:async(specification,key)=>{
      const existing=keys.get(key);if(existing&&Date.parse(previews.get(existing)!.preview.expiresAt)>Date.now())return previews.get(existing)!.preview;
      const project=await load(),result=processSnapshot(project.snapshot,specification);
      if(expectedVersion!==undefined&&localVersion(project)!==expectedVersion)throw new Error('Bản local đã đổi ở tab khác; tải lại trước khi tạo preview');
      const candidate=result.errors.length?project.snapshot:result.snapshot;
      const projection=projectPreview(project.snapshot,candidate,specification),id=crypto.randomUUID();
      const before=new Map(project.snapshot.rows.map(row=>[row.rowId,row])),after=new Map(candidate.rows.map(row=>[row.rowId,row]));
      const changes=projection.changes.map(change=>{
        const a=before.get(change.rowId),b=after.get(change.rowId);
        const ids=[...new Set([...Object.keys(a?.cells??{}),...Object.keys(b?.cells??{})])];
        return {...change,beforeCells:a?.cells??null,afterCells:b?.cells??null,diffColumnIds:ids.filter(id=>!a?.cells[id]||!b?.cells[id]||!sameCell(a.cells[id],b.cells[id])||a.cells[id].rawToken!==b.cells[id].rawToken)};
      });
      const errorSamples=result.errors.slice(0,100),warningSamples=result.warnings.slice(0,100-errorSamples.length);
      const preview:Preview={previewId:id,status:result.errors.length?'invalid':'ready',canApply:result.canApply&&!result.errors.length,baseVersionId:localVersion(project),candidateVersionId:result.canApply?id:null,engineVersion:ENGINE_VERSION,specHash:JSON.stringify(specification),summary:projection.summary,schemaChanges:projection.schemaChanges,diagnostics:{errorCount:result.errors.length,warningCount:result.warnings.length,errors:errorSamples,warnings:warningSamples,truncated:errorSamples.length<result.errors.length||warningSamples.length<result.warnings.length},expiresAt:new Date(Date.now()+30*60_000).toISOString()};
      previews.set(id,{preview,baseVersion:localVersion(project),specification:structuredClone(specification),snapshot:candidate,changes});keys.set(key,id);return preview;
    },
    get:async(id,page)=>{const data=previews.get(id);if(!data)throw new Error('Preview không tồn tại; hãy tạo lại');return {preview:data.preview,changes:data.changes.slice((page-1)*50,page*50),page,limit:50,totalChanges:data.changes.length,totalPages:Math.ceil(data.changes.length/50)};},
    apply:(id,key)=>projectLock(projectId,async()=>{
      const project=await load();
      if(project.operations.some(operation=>operation.id===key))return project;
      const data=previews.get(id);if(!data||Date.parse(data.preview.expiresAt)<=Date.now())throw new PreviewRejected('Preview đã hết hạn; hãy tạo lại');
      if(!data.preview.canApply||data.preview.status!=='ready')throw new PreviewRejected('Preview không có thay đổi hợp lệ');
      // An acquired project lock proves there is no live sync writer. A persisted
      // "syncing" status may be left after a crash; retain its receipt and allow local work.
      if(localVersion(project)!==data.baseVersion)throw new PreviewRejected('Bản local đã đổi ở tab khác; tải lại và tạo preview mới');
      project.operations.push({id:key,kind:'process',specification:data.specification,snapshot:data.snapshot,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),phase:'queued'});
      if(data.specification.method==='tfidf')project.engineVersion=ENGINE_VERSION;project.snapshot=data.snapshot;project.status='local';delete project.error;
      await projectStore.save(project);data.preview={...data.preview,status:'applied',canApply:false};return project;
    }),
    categories:async column=>{
      const project=await load(),values=new Map<string,Snapshot['rows'][number]['cells'][string]>();
      for(const row of project.snapshot.rows){const cell=row.cells[column];if(!cell)throw new Error('Cột không tồn tại');if(missingKind(cell)===undefined)values.set(cellKey(cell),cell);if(values.size>5000)throw new Error('Vượt 5000 category; không thể tạo mapping ordinal');}
      return [...values.values()];
    },
  };
}
