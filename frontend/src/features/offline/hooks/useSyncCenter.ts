import { useEffect, useState } from 'react';

import type { LocalProject } from '../repositories/project-store';
import { setAutoSync,downloadServerCopy } from '../services/sync-center-service';
import { subscribeProjectProgress, type ProjectProgress } from '../domain/project-events';

export type SyncCenterProps = {project:LocalProject;busy:boolean;authenticated:boolean;onSync():void;onReload():Promise<void>;onMessage(message:string):void};
export function useSyncCenter({project,busy,authenticated,onSync,onReload,onMessage}:{project:LocalProject;busy:boolean;authenticated:boolean;onSync():void;onReload():Promise<void>;onMessage(message:string):void}){
  const [progress,setProgress]=useState<ProjectProgress>(),[page,setPage]=useState(1),[reading,setReading]=useState(false),[optimisticAuto,setOptimisticAuto]=useState<boolean>(),[settingsBusy,setSettingsBusy]=useState(false);
  useEffect(()=>subscribeProjectProgress(value=>{if(value.id===project.id)setProgress(value);}),[project.id]);
  const live=progress?.id===project.id?progress:undefined,status=live?.status??project.status,cursor=live?.cursor??project.cursor,total=live?.total??project.operations.length,error=live?live.error:project.error;
  const stale=live&&live.version!==(project.operations.at(-1)?.id??'original');
  const auto=live?!!live.autoSync:!!project.autoSync,retry=live?live.syncRetry:project.syncRetry;
  async function automatic(value:boolean){
    if(settingsBusy)return;setOptimisticAuto(value);setSettingsBusy(true);
    try{await setAutoSync(project.id,value);onMessage(value?'Đã bật đồng bộ tự động cho project đã gắn tài khoản':'Đã giữ bản local và tắt đồng bộ tự động');}
    catch(error){onMessage(error instanceof Error?error.message:'Không lưu được lựa chọn đồng bộ');}
    finally{setOptimisticAuto(undefined);setSettingsBusy(false);}
  }
  async function serverCopy(){
    if(!project.projectId||reading)return;setReading(true);
    try{
      await downloadServerCopy(project);onMessage('Đã tải bản server để đối chiếu; bản local được giữ nguyên');
    }catch(error){onMessage(error instanceof Error?error.message:'Không tải được bản server');}finally{setReading(false);}
  }

  return {project,busy,authenticated,onSync,onReload,progress,page,setPage,reading,optimisticAuto,settingsBusy,live,status,cursor,total,error,stale,auto,retry,automatic,serverCopy};
}
export type SyncCenterModel = ReturnType<typeof useSyncCenter>;
