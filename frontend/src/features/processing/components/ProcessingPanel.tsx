import { useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import type { Cell,Column,ProcessingMethod,ProcessingSpecification,Scope } from '@dashboard/data-core';
import { Button,Feedback,useWorkspacePreviewHost, type ProcessingGroup } from '../../../shared/ui';
import { ApiError,requestJson } from '../../../shared/api';
import { processingApi } from '../api/processing-api';
import { allowedScopes,labels,makeSpecification,presets,methodGroups } from '../methods';
import { MethodParameters } from './MethodParameters';
import { PreviewView } from './PreviewView';
import type { Preview,PreviewPage } from '../types';
import { PreviewRejected } from '../types';

export interface ProcessingAdapter {
  preview(specification:ProcessingSpecification,key:string):Promise<Preview>;
  get(previewId:string,page:number):Promise<PreviewPage>;
  apply(previewId:string,key:string):Promise<unknown>;
  categories(columnId:string):Promise<Cell[]>;
}
export function onlineProcessing(datasetId:string,versionId:string):ProcessingAdapter{
  return {
    preview:(spec,key)=>processingApi.preview(datasetId,versionId,spec,key),
    get:(id,page)=>processingApi.get(datasetId,id,page),
    apply:(id,key)=>processingApi.apply(datasetId,id,key),
    categories:async column=>{
      const values:Cell[]=[];
      for(let page=1;;page++){
        const data=await requestJson<{items:{value:Cell|null;isMissing:boolean}[];totalCategories:number;totalPages:number}>(`datasets/${datasetId}/versions/${versionId}/analysis/columns/${column}/value-counts?page=${page}&limit=100&includeMissing=false`);
        if(data.totalCategories>5000)throw new Error('Vượt 5000 category; không thể tạo mapping ordinal');
        values.push(...data.items.filter(item=>!item.isMissing&&item.value).map(item=>item.value!));
        if(page>=data.totalPages)return values;
      }
    },
  };
}
export function ProcessingPanel({adapter,columns,selectedCell,selectedValue:_selectedValue,onApplied,local=false,group='cleaning',onNavigationLock}:{adapter:ProcessingAdapter;columns:Column[];selectedCell?:{rowId:string;columnId:string}|null;selectedValue?:Cell;onApplied():Promise<void>;local?:boolean;group?:ProcessingGroup;onNavigationLock?(locked:boolean):void}){
  const previewHost=useWorkspacePreviewHost();
  const [method,setMethod]=useState<ProcessingMethod>(()=>methodGroups[group][0]),[parameters,setParameters]=useState<Record<string,unknown>>(()=>structuredClone(presets[methodGroups[group][0]]));
  const [scopeType,setScopeType]=useState<Scope['type']>('columns'),[columnIds,setColumnIds]=useState<string[]>(()=>columns[0]?[columns[0].columnId]:[]);
  const [result,setResult]=useState<PreviewPage>(),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now);
  const [advanced,setAdvanced]=useState(''),[advancedEnabled,setAdvancedEnabled]=useState(false);
  const working=useRef(false),pending=useRef<{payload:string;key:string}|undefined>(undefined),applyAttempt=useRef<{id:string;key:string;sent:boolean}|undefined>(undefined);
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
  function selectMethod(value:ProcessingMethod){setMethod(value);setParameters(structuredClone(presets[value]));setAdvancedEnabled(false);setAdvanced('');setResult(undefined);setRetryApply(false);applyAttempt.current=undefined;if(!allowedScopes(value).includes(scopeType))setScopeType(allowedScopes(value).includes('columns')?'columns':allowedScopes(value)[0]);}
  async function preview(){
    const scope:Scope=scopeType==='dataset'?{type:'dataset'}:scopeType==='columns'?{type:'columns',columnIds}:{type:'cell',rowId:selectedCell?.rowId??'',columnId:selectedCell?.columnId??''};
    const spec=makeSpecification(method,advancedEnabled?JSON.parse(advanced) as Record<string,unknown>:parameters,scope);
    if(pending.current?.payload!==payload)pending.current={payload,key:crypto.randomUUID()};
    try{
      const value=await adapter.preview(spec,pending.current.key);
      if(!active.current)return;
      // Keep the receipt target even if loading its first diff page fails.
      setResult({preview:value,changes:[],page:1,limit:50,totalChanges:0,totalPages:0});setPreviewLoaded(false);setPreviewPayload(payload);setRetryApply(false);
      applyAttempt.current={id:value.previewId,key:crypto.randomUUID(),sent:false};
      const page=await adapter.get(value.previewId,1);if(active.current){setResult(page);setPreviewLoaded(true);}
    }catch(error){if(error instanceof ApiError&&error.status===410)pending.current=undefined;throw error;}
  }
  async function page(number:number){if(!result)return;const next=await adapter.get(result.preview.previewId,number);if(active.current){setResult(next);setPreviewLoaded(true);}}
  async function apply(){
    if(!result||!applyAttempt.current)return;
    applyAttempt.current.sent=true;setRetryApply(true);
    try{await adapter.apply(result.preview.previewId,applyAttempt.current.key);}
    catch(error){if(error instanceof PreviewRejected||error instanceof ApiError&&error.status>=400&&error.status<500&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code)){setRetryApply(false);applyAttempt.current.sent=false;}throw error;}
    if(active.current){setMessage(local?'Đã lưu thay đổi offline':'Đã áp dụng phiên bản mới');setResult(undefined);await onApplied();}
  }
  const previewView=result&&<div className="preview-stage" data-testid="processing-preview"><div className="panel-heading"><p className="eyebrow">PREVIEW · BEFORE / AFTER</p><h2>Xem trước thay đổi</h2></div>{stale&&<p className="notice">Tham số hoặc ô chọn đã đổi; tạo preview mới trước khi Apply.</p>}{expired&&<p className="notice">Preview đã hết hạn. Tạo preview mới; yêu cầu Apply đã gửi vẫn có thể kiểm tra lại receipt.</p>}
      <PreviewView {...result} columns={columns} onPage={number=>void work(()=>page(number))}/>
      <Button disabled={busy||(!retryApply&&(!previewLoaded||stale||expired||!result.preview.canApply||result.preview.status!=='ready'))} onClick={()=>void work(apply)}>{retryApply?'Kiểm tra lại Apply':local?'Áp dụng offline':'Áp dụng thay đổi'}</Button>
      {' '}<Button variant="secondary" disabled={busy||retryApply} onClick={()=>{setResult(undefined);setPreviewLoaded(false);setPreviewPayload('');pending.current=undefined;applyAttempt.current=undefined;}}>Hủy bản xem trước</Button>
    </div>;
  return <section aria-label="Xử lý dữ liệu"><h2>{local?'Xử lý bản local':'Xử lý dữ liệu'}</h2><p className="muted">Xem trước để kiểm tra; chỉ Apply mới tạo phiên bản. Thống kê tính trên toàn cột. Bộ lọc bảng không giới hạn phạm vi xử lý.</p>
    <fieldset disabled={busy||retryApply}><legend>Phương pháp và phạm vi</legend><div className="form-grid"><div className="field"><label htmlFor="processing-method">Phương pháp</label><select id="processing-method" value={method} onChange={event=>selectMethod(event.target.value as ProcessingMethod)}>{methodGroups[group].map(key=><option key={key} value={key}>{key} · {labels[key as ProcessingMethod]}</option>)}</select></div><div className="field"><label htmlFor="processing-scope">Phạm vi</label><select id="processing-scope" value={scopeType} onChange={event=>setScopeType(event.target.value as Scope['type'])}>{allowedScopes(method).map(type=><option key={type} value={type}>{type==='cell'?'Ô đang chọn':type==='columns'?'Các cột chọn':'Toàn dataset'}</option>)}</select></div></div>
    {scopeType==='columns'&&<div className="field"><label htmlFor="processing-columns">Các cột xử lý</label><select id="processing-columns" multiple value={columnIds} onChange={event=>setColumnIds(Array.from(event.target.selectedOptions,item=>item.value))}>{columns.map(column=><option key={column.columnId} value={column.columnId}>{column.name}</option>)}</select><small>Ctrl/Cmd để chọn nhiều cột; ordinal chỉ một cột.</small></div>}
    {scopeType==='cell'&&<p>{selectedCell?`Ô được chọn: dòng ${selectedCell.rowId}, cột ${columns.find(column=>column.columnId===selectedCell.columnId)?.name??selectedCell.columnId}`:'Chọn một ô ở bảng trước.'}</p>}
    <MethodParameters method={method} parameters={parameters} onChange={setParameters} busy={busy} loadCategories={method==='ordinal'?()=>work(async()=>{if(columnIds.length!==1)throw new Error('Chọn đúng một cột ordinal');const values=await adapter.categories(columnIds[0]);if(active.current)setParameters(current=>({...current,mapping:values.map((value,label)=>({value,label}))}));}):undefined}/>
    <details><summary>Tham số JSON nâng cao</summary><label className="check"><input type="checkbox" checked={advancedEnabled} onChange={event=>{setAdvancedEnabled(event.target.checked);setAdvanced(JSON.stringify(parameters,null,2));}}/>Dùng JSON thay cho form</label><label htmlFor="processing-json">Tham số xử lý (JSON)</label><textarea id="processing-json" disabled={!advancedEnabled} value={advanced} onChange={event=>setAdvanced(event.target.value)}/></details></fieldset>
    <div className="toolbar"><Button disabled={busy||retryApply} onClick={()=>void work(preview)}>Xem trước thay đổi</Button>{result&&<Button variant="secondary" disabled={busy} onClick={()=>void work(()=>page(result.page))}>Tải lại preview</Button>}</div>
    {error&&<Feedback error>{error}</Feedback>}{message&&<p className="notice">{message}</p>}
    {previewView&&(previewHost?createPortal(previewView,previewHost):previewView)}
  </section>;
}
