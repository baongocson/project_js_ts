import {
  missingKind,analyzeSummary,analyzeDistribution,analyzeCorrelation,analyzePoints3d,analyzeValueCounts,
  type Snapshot,type Row,type SummaryQuery,type DistributionQuery,type Points3dQuery,type ValueCountsQuery,
  type AnalysisSummaryResult,type DistributionResult,type CorrelationResult,type Points3dResult,type ValueCountsResult,
} from '@dashboard/data-core';
import { requestJson } from '../../../shared/api';

export interface AnalysisAdapter {
  summary(query:SummaryQuery,signal?:AbortSignal):Promise<AnalysisSummaryResult>;
  distribution(column:string,query:DistributionQuery,signal?:AbortSignal):Promise<DistributionResult>;
  correlation(signal?:AbortSignal):Promise<CorrelationResult>;
  points(query:Points3dQuery,signal?:AbortSignal):Promise<Points3dResult>;
  counts(column:string,query:ValueCountsQuery,signal?:AbortSignal):Promise<ValueCountsResult>;
  row(id:string,signal?:AbortSignal):Promise<Row>;
  moments?(columnId:string): { mean:number; deviation:number } | null;
}
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
/** Analyze the full immutable version, never the paginated table view. */
export function localAnalysis(snapshot:Snapshot,versionId:string,originalByteSize:number):AnalysisAdapter{
  const column=(id:string)=>{const value=snapshot.columns.find(column=>column.columnId===id);if(!value)throw new Error('Không tìm thấy cột');return value;};
  const run=<T>(action:()=>T,signal?:AbortSignal):Promise<T>=>Promise.resolve().then(()=>{signal?.throwIfAborted();return action();});
  return {
    moments: id => {
      function* values() {
        for (const row of snapshot.rows) {
          const cell = row.cells[id];
          if (cell?.kind === 'number' && Number.isFinite(cell.value) && missingKind(cell) === undefined) yield cell.value;
        }
      }
      let scale = 0;
      for (const value of values()) scale = Math.max(scale, Math.abs(value));
      scale ||= 1;
      let count = 0, mean = 0, squares = 0;
      for (const raw of values()) {
        const value = raw / scale;
        const delta = value - mean;
        mean += delta / ++count;
        squares += delta * (value - mean);
      }
      if (!count) return null;
      // Normalize to avoid overflow on extreme numbers, then return population deviation.
      return { mean: mean * scale, deviation: Math.sqrt(Math.max(0, squares / count)) * scale };
    },
    summary:(query,signal)=>run(()=>analyzeSummary(snapshot,versionId,originalByteSize,query),signal),
    distribution:(id,query,signal)=>run(()=>analyzeDistribution(snapshot,column(id),query),signal),
    correlation:signal=>run(()=>analyzeCorrelation(snapshot,{method:'pearson'}),signal),
    points:(query,signal)=>run(()=>{for(const id of [query.xColumnId,query.yColumnId,query.zColumnId])if(column(id).logicalType!=='number')throw new Error('Trục 3D phải là cột số');return analyzePoints3d(snapshot,query);},signal),
    counts:(id,query,signal)=>run(()=>{column(id);return analyzeValueCounts(snapshot,id,query);},signal),
    row:(id,signal)=>run(()=>{const value=snapshot.rows.find(row=>row.rowId===id);if(!value)throw new Error('Không tìm thấy dòng');return value;},signal),
  };
}
