import type { Row } from '@dashboard/data-core';
import { requestJson } from '../../../shared/api';
import type { AnalysisAdapter } from '../analysis-contract';

function search(query:object){
  const params=new URLSearchParams();
  for(const [key,value]of Object.entries(query))if(value!==undefined)params.set(key,Array.isArray(value)?value.join(','):String(value));
  return params;
}
export function onlineAnalysis(datasetId:string,versionId:string):AnalysisAdapter{
  const base=`datasets/${datasetId}/versions/${versionId}`;
  return {
    summary:(query,signal)=>requestJson(`${base}/analysis/summary?${search(query)}`,{signal}),
    distribution:(column,query,signal)=>requestJson(`${base}/analysis/columns/${column}/distribution?${search(query)}`,{signal}),
    correlation:signal=>requestJson(`${base}/analysis/correlation?method=pearson`,{signal}),
    points:(query,signal)=>requestJson(`${base}/analysis/points-3d?${search(query)}`,{signal}),
    counts:(column,query,signal)=>requestJson(`${base}/analysis/columns/${column}/value-counts?${search(query)}`,{signal}),
    row:async(id,signal)=>(await requestJson<{row:Row}>(`${base}/rows/${id}`,{signal})).row,
  };
}
