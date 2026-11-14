export interface SummaryQueryDto { outlierMethod:'iqr'|'zscore'; outlierThreshold:number; outlierColumnIds?:string[] }
export interface DistributionQueryDto { bins:number; outlierMethod:'iqr'|'zscore'; threshold:number }
export interface CorrelationQueryDto { method:'pearson' }
export interface Points3dQueryDto { xColumnId:string; yColumnId:string; zColumnId:string; colorMode:'normal'|'missing'|'outlier'; outlierColumnIds?:string[]; outlierMethod:'iqr'|'zscore'; threshold:number; maxPoints:number }
export interface ValueCountsQueryDto { page:number; limit:number; sort:'-count'|'value'; includeMissing:boolean }
