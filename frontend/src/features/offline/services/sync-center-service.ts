import { session } from '../../auth';
import { projectLock,projectStore,type LocalProject } from '../repositories/project-store';
import { ProjectApi } from '../api/project-api';
import { downloadFile } from './project-backup';

export async function setAutoSync(id:string,value:boolean){
  await projectLock(id,async()=>{const latest=await projectStore.load(id);if(!latest)throw new Error('Không tìm thấy project');latest.autoSync=value;delete latest.syncRetry;await projectStore.save(latest);});
}
export async function downloadServerCopy(project:LocalProject){
      const api=new ProjectApi(()=>session.accessToken()??''),me=await api.me();api.bindOwner(String(me._id));if(project.accountId&&project.accountId!==me._id)throw new Error('SYNC_ACCOUNT_MISMATCH');
      const detail=await api.detail(project.projectId!),dataset=detail.dataset as {_id:string;currentVersionId:string};if(!dataset?._id)throw new Error('Project server không có dataset');
      const snapshot=await api.snapshot(dataset._id,dataset.currentVersionId);
      downloadFile(`${project.name}.server-snapshot.json`,JSON.stringify({format:'data-workspace-server-snapshot',schema:1,projectId:project.projectId,datasetId:dataset._id,versionId:dataset.currentVersionId,downloadedAt:new Date().toISOString(),snapshot},null,2),'application/json');
}
