import { useResource, type AnalysisSettings } from './useAnalysisResource';
import { useCallback, useMemo } from 'react';
import type { Column, AnalysisSummaryResult } from '@dashboard/data-core';

import type { AnalysisAdapter } from '../services/analysis-service';

export type SummaryProps = {adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings};
export function useSummary({adapter,columns,config}:{adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings}){
  const query=useMemo(()=>({outlierMethod:config.outlierMethod,outlierThreshold:config.threshold,...(config.outlierColumnIds.length?{outlierColumnIds:config.outlierColumnIds}:{})}),[config.outlierMethod,config.threshold,config.outlierColumnIds]);
  const load=useCallback((signal:AbortSignal)=>adapter.summary(query,signal),[adapter,query]);
  const resource=useResource<AnalysisSummaryResult>(load),data=resource.data;
  const name=(id:string)=>columns.find(column=>column.columnId===id)?.name??id;

  return {resource,data,name};
}
export type SummaryModel = ReturnType<typeof useSummary>;
