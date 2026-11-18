

import { useResource, type AnalysisSettings } from './useAnalysisResource';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Column, Row, Points3dResult } from '@dashboard/data-core';

import type { AnalysisAdapter } from '../api/analysis-adapters';

import type { ProcessingAdapter } from '../../processing';

export type PointsProps = {adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings;onConfig(config:AnalysisSettings):void;onRow?(row:Row):void;editor?:ProcessingAdapter;onEdited?():Promise<void>;initialRowId?:string;locked:boolean;onLock(locked:boolean):void};
export function usePoints({adapter,columns,config,onConfig,onRow,editor,onEdited,initialRowId,locked,onLock}:{adapter:AnalysisAdapter;columns:Column[];config:AnalysisSettings;onConfig(config:AnalysisSettings):void;onRow?(row:Row):void;editor?:ProcessingAdapter;onEdited?():Promise<void>;initialRowId?:string;locked:boolean;onLock(locked:boolean):void}){
  const numericColumns=columns.filter(column=>column.logicalType==='number');
  const [maxPoints,setMaxPoints]=useState(10000),[selected,setSelected]=useState<Row>(),[rowError,setRowError]=useState(''),[rowBusy,setRowBusy]=useState(false);
  const selection=useRef<AbortController|undefined>(undefined);
  useEffect(()=>()=>selection.current?.abort(),[]);
  const pointsQuery=useMemo(()=>{
    const numbers=columns.filter(column=>column.logicalType==='number');
    const xColumnId=config.xColumnId??numbers[0]?.columnId??'';
    const yColumnId=config.yColumnId??numbers[1]?.columnId??xColumnId;
    const zColumnId=config.zColumnId??numbers[2]?.columnId??yColumnId;
    return {xColumnId,yColumnId,zColumnId,colorMode:config.colorMode,outlierMethod:config.outlierMethod,threshold:config.threshold,maxPoints};
  },[columns,config,maxPoints]);
  const {xColumnId:x,yColumnId:y,zColumnId:z}=pointsQuery;
  const load=useCallback((signal:AbortSignal)=>{
    if(!pointsQuery.xColumnId||!pointsQuery.yColumnId||!pointsQuery.zColumnId)return Promise.resolve<Points3dResult>({points:[],hiddenInvalidCoordsCount:0,hiddenMissingCoordsCount:0,sampling:{applied:false,totalEligible:0,returned:0,method:'stable-rowid'}});
    return adapter.points(pointsQuery,signal);
  },[adapter,pointsQuery]);
  const resource=useResource<Points3dResult>(load,true),data=resource.data;
  async function select(id:string){if(locked&&id!==selected?.rowId){setRowError('Hãy lưu hoặc bỏ thay đổi của dòng đang sửa trước khi chọn dòng khác.');return;}selection.current?.abort();const abort=new AbortController();selection.current=abort;setRowBusy(true);setRowError('');try{const row=await adapter.row(id,abort.signal);if(!abort.signal.aborted){setSelected(row);onRow?.(row);}}catch(error){if(!abort.signal.aborted)setRowError(error instanceof Error?error.message:'Không đọc được dòng');}finally{if(!abort.signal.aborted)setRowBusy(false);}}
  useEffect(()=>{if(!initialRowId)return;const abort=new AbortController();void adapter.row(initialRowId,abort.signal).then(row=>{if(!abort.signal.aborted)setSelected(row);}).catch(()=>{});return()=>abort.abort();},[adapter,initialRowId]);

  return {columns,config,onConfig,editor,onEdited,locked,onLock,numericColumns,maxPoints,setMaxPoints,selected,rowError,rowBusy,x,y,z,resource,data,select};
}
export type PointsModel = ReturnType<typeof usePoints>;
