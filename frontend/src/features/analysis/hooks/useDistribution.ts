
import { useResource, type AnalysisSettings } from './useAnalysisResource';
import { useCallback, useState } from 'react';
import type { Column, DistributionResult, ValueCountsResult } from '@dashboard/data-core';

import type { AnalysisAdapter } from '../api/analysis-adapters';

export type DistributionProps = {adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings};
export function useDistribution({adapter,columns,config}:{adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings}){
  const [column,setColumn]=useState(columns[0]?.columnId??''),[bins,setBins]=useState(20),[page,setPage]=useState(1),[sort,setSort]=useState<'-count'|'value'>('-count'),[includeMissing,setIncludeMissing]=useState(true);
  const load=useCallback((signal:AbortSignal)=>Promise.all([adapter.distribution(column,{bins,outlierMethod:config.outlierMethod,threshold:config.threshold},signal),adapter.counts(column,{page,limit:20,sort,includeMissing},signal)]),[adapter,column,bins,config.outlierMethod,config.threshold,page,sort,includeMissing]);
  const resource=useResource<[DistributionResult,ValueCountsResult]>(load),distribution=resource.data?.[0],counts=resource.data?.[1];
  const max=distribution?Math.max(1,...distribution.histogram.map(bin=>bin.count)):1;

  return {columns,column,setColumn,bins,setBins,page,setPage,sort,setSort,includeMissing,setIncludeMissing,resource,distribution,counts,max};
}
export type DistributionModel = ReturnType<typeof useDistribution>;
