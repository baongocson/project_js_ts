// Pure response/query contracts are shared by server and offline adapters in Data Core.
export type { AnalysisSummaryResult,DistributionResult,CorrelationResult,Points3dResult,ValueCountsResult } from '@dashboard/data-core';
import type { Points3dResult } from '@dashboard/data-core';
export type ScatterPoint = Points3dResult['points'][number];
export interface ScatterProps {
  axes?: NonNullable<Points3dResult['axes']>;
  points: ScatterPoint[];
  colorMode: 'normal' | 'missing' | 'outlier';
  labels: [string, string, string];
  selected?: string;
  onSelect(id: string): void;
}

export interface AnalysisSettings {xColumnId:string|null;yColumnId:string|null;zColumnId:string|null;colorMode:'normal'|'missing'|'outlier';outlierColumnIds:string[];outlierMethod:'iqr'|'zscore';threshold:number}
