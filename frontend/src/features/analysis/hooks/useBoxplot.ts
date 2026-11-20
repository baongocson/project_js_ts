import { useEffect, useState } from 'react';
import type { Column, DistributionResult } from '@dashboard/data-core';
import type { AnalysisAdapter } from '../services/analysis-service';

export type BoxplotProps = {adapter:AnalysisAdapter;columns:Column[]};
export function useBoxplot({adapter,columns}:{adapter:AnalysisAdapter;columns:Column[]}){
  const numbers=columns.filter(column=>column.logicalType==='number');
  const [chosen,setChosen]=useState(numbers[0]?.columnId??''),[data,setData]=useState<DistributionResult>(),[error,setError]=useState('');
  useEffect(()=>{
    if(!chosen)return;const abort=new AbortController();
    void adapter.distribution(chosen,{bins:20,outlierMethod:'iqr',threshold:1.5},abort.signal).then(value=>{if(!abort.signal.aborted){setData(value);setError('');}}).catch(error=>{if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Không đọc được boxplot');});
    return()=>abort.abort();
  },[adapter,chosen]);
  const box=data?.columnId===chosen?data.boxplot:undefined;
  const x=(value:number)=>{if(!box||box.max===box.min)return 320;const scale=Math.max(1,Math.abs(box.min),Math.abs(box.max));return 45+(value/scale-box.min/scale)/(box.max/scale-box.min/scale)*550;};
  const f=(value:number)=>value.toLocaleString('vi-VN',{maximumSignificantDigits:6});

  return {numbers,chosen,setChosen,data,error,box,x,f};
}
export type BoxplotModel = ReturnType<typeof useBoxplot>;
