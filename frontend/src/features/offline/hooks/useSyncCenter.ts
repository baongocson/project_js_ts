import { useEffect, useState } from 'react';

import { session } from '../../auth';
import { projectLock, projectStore, type LocalProject } from '../project-store';
import { ProjectApi } from '../project-sync';
import { downloadFile } from '../project-backup';
import { subscribeProjectProgress, type ProjectProgress } from '../project-events';

export type SyncCenterProps = {project:LocalProject;busy:boolean;authenticated:boolean;onSync():void;onReload():Promise<void>;onMessage(message:string):void};
export function useSyncCenter({project,busy,authenticated,onSync,onReload,onMessage}:{project:LocalProject;busy:boolean;authenticated:boolean;onSync():void;onReload():Promise<void>;onMessage(message:string):void}){
  const [progress,setProgress]=useState<ProjectProgress>(),[page,setPage]=useState(1),[reading,setReading]=useState(false),[optimisticAuto,setOptimisticAuto]=useState<boolean>(),[settingsBusy,setSettingsBusy]=useState(false);
  useEffect(()=>subscribeProjectProgress(value=>{if(value.id===project.id)setProgress(value);}),[project.id]);
  const live=progress?.id===project.id?progress:undefined,status=live?.status??project.status,cursor=live?.cursor??project.cursor,total=live?.total??project.operations.length,error=live?live.error:project.error;
  const stale=live&&live.version!==(project.operations.at(-1)?.id??'original');
  const auto=live?!!live.autoSync:!!project.autoSync,retry=live?live.syncRetry:project.syncRetry;
  async function automatic(value:boolean){
    if(settingsBusy)return;setOptimisticAuto(value);setSettingsBusy(true);
    try{await projectLock(project.id,async()=>{const latest=await projectStore.load(project.id);if(!latest)throw new Error('Không tìm thấy project');latest.autoSync=value;delete latest.syncRetry;await projectStore.save(latest);});onMessage(value?'Đã bật đồng bộ tự động cho project đã gắn tài khoản':'Đã giữ bản local và tắt đồng bộ tự động');}
    catch(error){onMessage(error instanceof Error?error.message:'Không lưu được lựa chọn đồng bộ');}
    finally{setOptimisticAuto(undefined);setSettingsBusy(false);}
  }
  async function serverCopy(){
    if(!project.projectId||reading)return;setReading(true);
    try{
      const api=new ProjectApi(()=>session.accessToken()??''),me=await api.request('users/me');api.bindOwner(String(me._id));if(project.accountId&&project.accountId!==me._id)throw new Error('SYNC_ACCOUNT_MISMATCH');
      const detail=await api.request(`projects/${project.projectId}`),dataset=detail.dataset as {_id:string;currentVersionId:string};if(!dataset?._id)throw new Error('Project server không có dataset');
      const snapshot=await api.snapshot(dataset._id,dataset.currentVersionId);
      downloadFile(`${project.name}.server-snapshot.json`,JSON.stringify({format:'data-workspace-server-snapshot',schema:1,projectId:project.projectId,datasetId:dataset._id,versionId:dataset.currentVersionId,downloadedAt:new Date().toISOString(),snapshot},null,2),'application/json');onMessage('Đã tải bản server để đối chiếu; bản local được giữ nguyên');
    }catch(error){onMessage(error instanceof Error?error.message:'Không tải được bản server');}finally{setReading(false);}
  }

  return {project,busy,authenticated,onSync,onReload,progress,page,setPage,reading,optimisticAuto,settingsBusy,live,status,cursor,total,error,stale,auto,retry,automatic,serverCopy};
}
export type SyncCenterModel = ReturnType<typeof useSyncCenter>;
