import { useId, useState } from 'react';
import type { Cell, Column, Row, RowFilter, TableState, Selection } from '@dashboard/data-core';

export interface TableRows {rows:Row[];totalRows:number;filteredRows:number;totalPages:number}
function valueFor(kind:Cell['kind'],input:string):Cell{
  if(kind==='null')return {kind,value:null};
  if(kind==='number'){const value=Number(input);if(!input.trim()||!Number.isFinite(value)||Number.isInteger(value)&&!Number.isSafeInteger(value))throw new Error('Nhập số hữu hạn và trong độ chính xác cho filter');return {kind,value};}
  if(kind==='boolean'){if(!['true','false'].includes(input))throw new Error('Filter boolean chỉ nhận true hoặc false');return {kind,value:input==='true'};}
  if(kind==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(input)||!Number.isFinite(Date.parse(input))||new Date(input).toISOString().slice(0,10)!==input))throw new Error('Filter ngày cần YYYY-MM-DD hợp lệ');
  if(kind==='datetime'&&(!/^\d{4}-\d{2}-\d{2}T/.test(input)||!Number.isFinite(Date.parse(input))))throw new Error('Filter datetime cần ISO8601 hợp lệ');
  return {kind,value:kind==='datetime'?new Date(input).toISOString():input};
}
export type DataTableProps = {columns:Column[];data?:TableRows;state:TableState;selected:Selection['cell'];onState(state:TableState):void;onSelect(rowId:string,columnId:string):void;onEdit?(rowId:string,columnId:string):void;title?:string};
export function useDataTable({columns,data,state,selected,onState,onSelect,onEdit,title='Bảng dữ liệu'}:{columns:Column[];data?:TableRows;state:TableState;selected:Selection['cell'];onState(state:TableState):void;onSelect(rowId:string,columnId:string):void;onEdit?(rowId:string,columnId:string):void;title?:string}){
  const id=useId();
  const [column,setColumn]=useState(''),[op,setOp]=useState('contains'),[input,setInput]=useState(''),[kind,setKind]=useState<Cell['kind']>(),[error,setError]=useState('');
  const target=columns.find(item=>item.columnId===column)??columns[0],missing=['isMissing','isNotMissing'].includes(op);
  const filterKind=kind??(target?.logicalType==='mixed'?'text':target?.logicalType??'text');
  function filter(append=false){if(!target)return;try{
    const value=missing?undefined:valueFor(op==='contains'?'text':filterKind,input);
    const condition={columnId:target.columnId,op,...(value?{value}:{})} as RowFilter;
    onState({...state,page:1,filters:append?[...state.filters,condition]:[condition]});setError('');
  }catch(error){setError(error instanceof Error?error.message:'Filter không hợp lệ');}}

  return {columns,data,state,selected,onState,onSelect,onEdit,title,id,column,setColumn,op,setOp,input,setInput,kind,setKind,error,setError,target,missing,filterKind,filter};
}
export type DataTableModel = ReturnType<typeof useDataTable>;
