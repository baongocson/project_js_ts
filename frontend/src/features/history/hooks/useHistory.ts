import { historyApi } from '../api/history-api';

import type { Operation, HistoryPage } from '../types';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../shared/api';

export type HistoryProps = {datasetId:string;currentVersionId:string;onRestored():Promise<void>};
export function useHistory({datasetId,currentVersionId,onRestored}:{datasetId:string;currentVersionId:string;onRestored():Promise<void>}){
  const [page,setPage]=useState(1),[kind,setKind]=useState(''),[data,setData]=useState<HistoryPage>(),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[target,setTarget]=useState<Operation>();
  const [refresh,setRefresh]=useState(0),[sent,setSent]=useState(false);
  const attempt=useRef<{target:string;key:string;sent:boolean}|undefined>(undefined),working=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();
    void historyApi.list(datasetId,page,kind,abort.signal).then(value=>{setData(value);setError('');setLoading(false);}).catch(error=>{if(!abort.signal.aborted){setError(error instanceof Error?error.message:'Không tải được lịch sử');setLoading(false);}});
    return()=>abort.abort();
  },[datasetId,currentVersionId,page,kind,refresh]);
  function open(operation:Operation){setSent(false);attempt.current={target:operation.resultVersionId,key:crypto.randomUUID(),sent:false};setTarget(operation);setError('');}
  async function restore(){
    if(working.current||!target||!attempt.current)return;working.current=true;setBusy(true);setError('');attempt.current.sent=true;setSent(true);
    try{
      await historyApi.restore(datasetId,target.resultVersionId,currentVersionId,attempt.current.key);
      setTarget(undefined);attempt.current=undefined;setSent(false);await onRestored();
    }catch(error){if(error instanceof ApiError&&error.status>=400&&error.status<500&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code)&&attempt.current){attempt.current.sent=false;setSent(false);}setError(error instanceof Error?error.message:'Không khôi phục được phiên bản');}
    finally{working.current=false;setBusy(false);}
  }

  const closeRestore:()=>void = ()=>{if(!busy&&!attempt.current?.sent){setTarget(undefined);attempt.current=undefined;}};
return {currentVersionId,page,setPage,kind,setKind,data,error,loading,setLoading,busy,target,setTarget,setRefresh,sent,attempt,open,restore,closeRestore};
}
export type HistoryModel = ReturnType<typeof useHistory>;
