import { requestJson } from '../../../shared/api';
import type { HistoryPage } from '../types';

export const historyApi = {
  list(datasetId:string,page:number,kind:string,signal?:AbortSignal) {
    return requestJson<HistoryPage>(`datasets/${datasetId}/operations?page=${page}&limit=10${kind?`&kind=${kind}`:''}`,{signal});
  },
  restore(datasetId:string,targetVersionId:string,currentVersionId:string,key:string) {
    return requestJson(`datasets/${datasetId}/versions/${targetVersionId}/restore`,{
      method:'POST',json:{expectedCurrentVersionId:currentVersionId},headers:{'Idempotency-Key':key},
    });
  },
};
