

import { useResource } from './useAnalysisResource';
import { useCallback, useMemo, useState } from 'react';
import type { CorrelationResult } from '@dashboard/data-core';

import type { AnalysisAdapter } from '../services/analysis-service';

export type CorrelationProps = {adapter:AnalysisAdapter};
export function useCorrelation({adapter}:{adapter:AnalysisAdapter}){
  const load=useCallback((signal:AbortSignal)=>adapter.correlation(signal),[adapter]),resource=useResource<CorrelationResult>(load),data=resource.data;
  const [rowPage,setRowPage]=useState(0),[columnPage,setColumnPage]=useState(0);const limit=20;
  const [selectedPair,setSelectedPair]=useState('');
  const unavailable=useMemo(()=>new Map(data?.naReasons.map(item=>[`${item.rowColumnId}:${item.columnColumnId}`,item.reason])),[data]);

  return {resource,data,rowPage,setRowPage,columnPage,setColumnPage,limit,selectedPair,setSelectedPair,unavailable};
}
export type CorrelationModel = ReturnType<typeof useCorrelation>;
