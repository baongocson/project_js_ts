import { useEffect, useRef, useState } from 'react';

import type { Cell, Column, ProcessingMethod, ProcessingSpecification, Scope } from '@dashboard/data-core';
import { useWorkspacePreviewHost, type ProcessingGroup } from '../../../shared/ui';
import { ProcessingSession } from '../services/processing-session';

import { allowedScopes, makeSpecification, presets, methodGroups } from '../methods';

import type { ProcessingAdapter, PreviewPage } from '../types';

export type ProcessingProps = {adapter:ProcessingAdapter;columns:Column[];selectedCell?:{rowId:string;columnId:string}|null;selectedValue?:Cell;onApplied():Promise<void>;local?:boolean;group?:ProcessingGroup;onNavigationLock?(locked:boolean):void};
export function useProcessing({adapter,columns,selectedCell,selectedValue:_selectedValue,onApplied,local=false,group='cleaning',onNavigationLock}:{adapter:ProcessingAdapter;columns:Column[];selectedCell?:{rowId:string;columnId:string}|null;selectedValue?:Cell;onApplied():Promise<void>;local?:boolean;group?:ProcessingGroup;onNavigationLock?(locked:boolean):void}){
  const previewHost=useWorkspacePreviewHost();
  const [method,setMethod]=useState<ProcessingMethod>(()=>methodGroups[group][0]),[parameters,setParameters]=useState<Record<string,unknown>>(()=>structuredClone(presets[methodGroups[group][0]]));
  const [scopeType,setScopeType]=useState<Scope['type']>('columns'),[columnIds,setColumnIds]=useState<string[]>(()=>columns[0]?[columns[0].columnId]:[]);
  const [result,setResult]=useState<PreviewPage>(),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now);
  const [advanced,setAdvanced]=useState(''),[advancedEnabled,setAdvancedEnabled]=useState(false);
  const working=useRef(false),workflow=useRef(new ProcessingSession());
  const active=useRef(true);
  useEffect(()=>{active.current=true;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{active.current=false;clearInterval(timer);};},[]);
  const payload=JSON.stringify({method,parameters:advancedEnabled?advanced:parameters,scopeType,columnIds,selectedCell:scopeType==='cell'?selectedCell:null});
  const [previewPayload,setPreviewPayload]=useState(''),[retryApply,setRetryApply]=useState(false),[previewLoaded,setPreviewLoaded]=useState(false);
  useEffect(()=>{onNavigationLock?.(busy||retryApply);return()=>onNavigationLock?.(false);},[busy,retryApply,onNavigationLock]);
  const stale=previewPayload!==payload;
  const expired=!!result&&Date.parse(result.preview.expiresAt)<=now;
  async function work(action:()=>Promise<void>){
    if(working.current)return;working.current=true;setBusy(true);setError('');setMessage('');
    try{await action();}catch(error){if(active.current)setError(error instanceof Error?error.message:'Không thực hiện được thao tác');}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  function selectMethod(value:ProcessingMethod){setMethod(value);setParameters(structuredClone(presets[value]));setAdvancedEnabled(false);setAdvanced('');setResult(undefined);setRetryApply(false);workflow.current.resetAttempt();if(!allowedScopes(value).includes(scopeType))setScopeType(allowedScopes(value).includes('columns')?'columns':allowedScopes(value)[0]);}
  async function preview(){
    const scope:Scope=scopeType==='dataset'?{type:'dataset'}:scopeType==='columns'?{type:'columns',columnIds}:{type:'cell',rowId:selectedCell?.rowId??'',columnId:selectedCell?.columnId??''};
    const spec=makeSpecification(method,advancedEnabled?JSON.parse(advanced) as Record<string,unknown>:parameters,scope);
    await createPreview(spec,payload);
  }
  async function createPreview(spec:ProcessingSpecification,previewContext:string){
    const key=workflow.current.previewKey(previewContext);
    try{
      const value=await adapter.preview(spec,key);
      if(!active.current)return;
      // Keep the receipt target even if loading its first diff page fails.
      setResult({preview:value,changes:[],page:1,limit:50,totalChanges:0,totalPages:0});setPreviewLoaded(false);setPreviewPayload(previewContext);setRetryApply(false);
      workflow.current.acceptPreview(value.previewId);
      const page=await adapter.get(value.previewId,1);if(active.current){setResult(page);setPreviewLoaded(true);}
    }catch(error){workflow.current.previewFailed(error);throw error;}
  }
  async function previewSuggestion(spec:ProcessingSpecification){
    const nextColumns=spec.scope.type==='columns'?spec.scope.columnIds:columnIds;
    selectMethod(spec.method);setParameters(spec.parameters);setScopeType(spec.scope.type);setColumnIds(nextColumns);
    const context=JSON.stringify({method:spec.method,parameters:spec.parameters,scopeType:spec.scope.type,columnIds:nextColumns,selectedCell:null});
    await createPreview(spec,context);
  }
  async function page(number:number){if(!result)return;const next=await adapter.get(result.preview.previewId,number);if(active.current){setResult(next);setPreviewLoaded(true);}}
  function cancelPreview(){setResult(undefined);setPreviewLoaded(false);setPreviewPayload('');workflow.current.cancel();}
  async function loadCategories(){if(columnIds.length!==1)throw new Error('Chọn đúng một cột ordinal');const values=await adapter.categories(columnIds[0]);if(active.current)setParameters(current=>({...current,mapping:values.map((value,label)=>({value,label}))}));}
  async function apply(){
    if(!result)return;const attempt=workflow.current.beginApply();if(!attempt)return;
    setRetryApply(true);
    try{await adapter.apply(result.preview.previewId,attempt.key);}
    catch(error){if(workflow.current.applyFailed(error))setRetryApply(false);throw error;}
    if(active.current){setMessage(local?'Đã lưu thay đổi offline':'Đã áp dụng phiên bản mới');setResult(undefined);await onApplied();}
  }

  return {adapter,columns,selectedCell,local,group,previewHost,method,parameters,setParameters,scopeType,setScopeType,columnIds,setColumnIds,result,error,message,busy,advanced,setAdvanced,advancedEnabled,setAdvancedEnabled,retryApply,previewLoaded,stale,expired,work,selectMethod,preview,previewSuggestion,page,cancelPreview,loadCategories,apply};
}
export type ProcessingModel = ReturnType<typeof useProcessing>;
