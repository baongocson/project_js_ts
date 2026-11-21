import type { Row,SummaryQuery,DistributionQuery,Points3dQuery,ValueCountsQuery,AnalysisSummaryResult,DistributionResult,CorrelationResult,Points3dResult,ValueCountsResult } from '@dashboard/data-core';
export interface AnalysisAdapter {
  summary(query:SummaryQuery,signal?:AbortSignal):Promise<AnalysisSummaryResult>;
  distribution(column:string,query:DistributionQuery,signal?:AbortSignal):Promise<DistributionResult>;
  correlation(signal?:AbortSignal):Promise<CorrelationResult>;
  points(query:Points3dQuery,signal?:AbortSignal):Promise<Points3dResult>;
  counts(column:string,query:ValueCountsQuery,signal?:AbortSignal):Promise<ValueCountsResult>;
  moments?(columnId:string): { mean:number; deviation:number } | null;
  row(id:string,signal?:AbortSignal):Promise<Row>;
}
