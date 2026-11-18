

import { type AnalysisSettings } from './useAnalysisResource';
import { useEffect, useState } from 'react';
import type { Column, Row } from '@dashboard/data-core';

import type { AnalysisAdapter } from '../api/analysis-adapters';

import type { ProcessingAdapter } from '../../processing';

export type AnalysisProps = {adapter:AnalysisAdapter;columns:Column[];initialConfig?:AnalysisSettings;onConfig?(config:AnalysisSettings):void;onRow?(row:Row):void;initialTab?:'summary'|'points';editor?:ProcessingAdapter;onEdited?():Promise<void>;initialRowId?:string;onEditingLock?(locked:boolean):void};
export function useAnalysis({adapter,columns,initialConfig,onConfig,onRow,initialTab='summary',editor,onEdited,initialRowId,onEditingLock}:{adapter:AnalysisAdapter;columns:Column[];initialConfig?:AnalysisSettings;onConfig?(config:AnalysisSettings):void;onRow?(row:Row):void;initialTab?:'summary'|'points';editor?:ProcessingAdapter;onEdited?():Promise<void>;initialRowId?:string;onEditingLock?(locked:boolean):void}){
  const [tab,setTab]=useState<string>(initialTab),[config,setConfig]=useState<AnalysisSettings>(()=>initialConfig??{xColumnId:null,yColumnId:null,zColumnId:null,colorMode:'normal',outlierColumnIds:[],outlierMethod:'iqr',threshold:1.5});
  const [editingLocked,setEditingLocked]=useState(false);
  useEffect(()=>{onEditingLock?.(editingLocked);return()=>onEditingLock?.(false);},[editingLocked,onEditingLock]);
  function change(value:AnalysisSettings){setConfig(value);onConfig?.(value);}

  return {adapter,columns,onConfig,onRow,editor,onEdited,initialRowId,tab,setTab,config,editingLocked,setEditingLocked,change};
}
export type AnalysisModel = ReturnType<typeof useAnalysis>;
