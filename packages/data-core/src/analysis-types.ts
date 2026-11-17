import type { Cell,LogicalType } from './types.js';
export interface SummaryQuery { outlierMethod:'iqr'|'zscore'; outlierThreshold:number; outlierColumnIds?:string[] }
export interface DistributionQuery { bins:number; outlierMethod:'iqr'|'zscore'; threshold:number }
export interface CorrelationQuery { method:'pearson' }
export interface Points3dQuery { xColumnId:string; yColumnId:string; zColumnId:string; colorMode:'normal'|'missing'|'outlier'; outlierColumnIds?:string[]; outlierMethod:'iqr'|'zscore'; threshold:number; maxPoints:number }
export interface ValueCountsQuery { page:number; limit:number; sort:'-count'|'value'; includeMissing:boolean }

export interface OutlierColumn {columnId:string;count:number;lower:number|null;upper:number|null;status:'ok'|'not_applicable';reason:null|'non_numeric'|'all_missing'|'constant_column'}
export interface AnalysisSummaryResult {versionId:string;originalByteSize:number;rowCount:number;columnCount:number;missingCount:number;missingRate:number|null;missingByColumn:{columnId:string;count:number;rate:number|null}[];duplicateRowCount:number;outliersByColumn:OutlierColumn[];datatypes:{columnId:string;logicalType:LogicalType}[]}
export interface HistogramBin {lowerBound:number;upperBound:number;count:number}
export interface BoxplotStats {min:number;q1:number;median:number;q3:number;max:number;lowerWhisker:number;upperWhisker:number;lowerFence:number;upperFence:number;outlierCount:number;outliers:{rowId:string;value:number}[];truncated:boolean}
export interface DistributionResult {columnId:string;logicalType:LogicalType;missingCount:number;histogram:HistogramBin[];histogramStatus:'ok'|'constant_column'|'not_applicable';outlierBounds:{lower:number;upper:number;count:number}|null;outlierStatus:'ok'|'not_applicable';reason:null|'non_numeric'|'all_missing'|'constant_column';boxplot?:BoxplotStats|null}
export interface UnplottablePoint {rowId:string;missingCount:number;isOutlier:boolean;outlierColumnIds:string[];reason:'missing_coordinates'|'invalid_coordinates'}
export interface CorrelationResult {columns:{columnId:string;name:string;logicalType:LogicalType}[];matrix:(number|null)[][];validPairCounts:number[][];naReasons:{rowColumnId:string;columnColumnId:string;reason:'non_numeric'|'insufficient_pairs'|'constant_column'}[]}
export interface Points3dResult {points:{rowId:string;x:number;y:number;z:number;missingCount:number;isOutlier:boolean;outlierColumnIds:string[]}[];hiddenMissingCoordsCount:number;hiddenInvalidCoordsCount:number;sampling:{applied:boolean;totalEligible:number;returned:number;method:'stable-rowid'};axes?:{columnId:string;min:number|null;max:number|null}[];unplottablePoints?:UnplottablePoint[];unplottableTotal?:number;flaggedCounts?:{missingRows:number;outlierRows:number}}
export type ValueCountItem = {value:Cell;isMissing:false;count:number;rate:number|null}|{value:null;isMissing:true;count:number;rate:number|null};
export interface ValueCountsResult {columnId:string;items:ValueCountItem[];page:number;limit:number;totalCategories:number;totalPages:number;missingCount:number;totalRows:number}
