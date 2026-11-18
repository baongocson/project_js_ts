import { useEffect, useRef, useState } from 'react';
import type { Cell, Column, Row } from '@dashboard/data-core';
import { makeSpecification, PreviewRejected, type ProcessingAdapter } from '../../processing';

import { ApiError } from '../../../shared/api';

export type PointRowEditorProps = {row:Row;columns:Column[];editor?:ProcessingAdapter;onApplied?():Promise<void>;onLock?(locked:boolean):void};
export function usePointRowEditor({row,columns,editor,onApplied,onLock}:{row:Row;columns:Column[];editor?:ProcessingAdapter;onApplied?():Promise<void>;onLock?(locked:boolean):void}){
  const [draft,setDraft]=useState<Record<string,{kind:Cell['kind'];value:string}>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const attempt=useRef<{columnId:string;value:Cell;previewKey:string;applyKey:string;previewId?:string;sent:boolean}|undefined>(undefined);
  const [uncertain,setUncertain]=useState(false),[pendingColumn,setPendingColumn]=useState<string>(),working=useRef(false);
  useEffect(()=>{onLock?.(busy||uncertain||Object.keys(draft).length>0);return()=>onLock?.(false);},[busy,uncertain,draft,onLock]);
  useEffect(()=>{
    if(!busy&&!uncertain&&!Object.keys(draft).length)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    const leave=(event:MouseEvent)=>{const link=(event.target as Element).closest('a[href]');if(!link)return;if(busy||uncertain||!window.confirm('Bỏ thay đổi ô chưa lưu và rời trang?')){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',leave,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',leave,true);};
  },[busy,uncertain,draft]);
  const get=(columnId:string)=>draft[columnId]??{kind:row.cells[columnId]?.kind??'null',value:row.cells[columnId]?.value===null?'':String(row.cells[columnId]?.value??'')};
  function change(columnId:string,patch:Partial<{kind:Cell['kind'];value:string}>){setDraft(values=>({...values,[columnId]:{...get(columnId),...patch}}));setMessage('');setError('');}
  async function save(columnId:string){
    if(!editor||working.current)return;
    working.current=true;setBusy(true);setError('');setMessage('');
    try{
      if(!attempt.current){
        const value=get(columnId);
        const cell:Cell=value.kind==='null'?{kind:'null',value:null}:value.kind==='number'?(value.value.trim()===''?{kind:'text',value:''}:{kind:'number',value:Number(value.value)}):value.kind==='boolean'?{kind:'boolean',value:value.value==='true'}:{kind:value.kind,value:value.value};
        makeSpecification('edit_cell',{value:cell},{type:'cell',rowId:row.rowId,columnId});
        setPendingColumn(columnId);attempt.current={columnId,value:cell,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),sent:false};
      }
      const current=attempt.current;
      if(current.columnId!==columnId)throw new Error('Cần kiểm tra lại lần lưu trước trước khi sửa ô khác.');
      if(!current.previewId){
        const preview=await editor.preview(makeSpecification('edit_cell',{value:current.value},{type:'cell',rowId:row.rowId,columnId}),current.previewKey);
        if(!preview.canApply||preview.status!=='ready'){
          attempt.current=undefined;setPendingColumn(undefined);setUncertain(false);
          if(preview.status==='invalid')throw new Error(preview.diagnostics.errors.map(item=>item.message).join('; ')||'Giá trị không phù hợp với kiểu cột.');
          setDraft(values=>{const next={...values};delete next[columnId];return next;});setMessage('Giá trị không thay đổi.');return;
        }
        current.previewId=preview.previewId;
      }
      current.sent=true;setUncertain(true);
      await editor.apply(current.previewId,current.applyKey);
      attempt.current=undefined;setPendingColumn(undefined);setUncertain(false);setDraft({});setMessage('Đã lưu ô và tạo phiên bản mới.');
      await onApplied?.();
    }catch(failure){
      if(failure instanceof PreviewRejected||failure instanceof ApiError&&failure.status>=400&&failure.status<500&&![408,429].includes(failure.status)&&failure.code!=='REQUEST_IN_PROGRESS'){attempt.current=undefined;setUncertain(false);}
      else if(attempt.current)setUncertain(true);
      setError(failure instanceof Error?failure.message:'Chưa xác nhận được kết quả lưu.');
    }finally{working.current=false;setBusy(false);}
  }

  return {row,columns,editor,draft,setDraft,busy,error,setError,message,uncertain,pendingColumn,get,change,save};
}
export type PointRowEditorModel = ReturnType<typeof usePointRowEditor>;
