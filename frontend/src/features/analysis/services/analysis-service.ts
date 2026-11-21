import { missingKind,analyzeSummary,analyzeDistribution,analyzeCorrelation,analyzePoints3d,analyzeValueCounts,type Snapshot } from '@dashboard/data-core';
import type { AnalysisAdapter } from '../analysis-contract';
export type { AnalysisAdapter } from '../analysis-contract';
export { onlineAnalysis } from '../api/analysis-api';

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
