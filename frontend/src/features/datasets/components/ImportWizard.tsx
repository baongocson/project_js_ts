import { useId,useRef,useState,type FormEvent } from 'react';
import { DataError,importCsv,type LogicalType,type Snapshot } from '@dashboard/data-core';
import { ApiError } from '../../../shared/api';
import { Button,Feedback } from '../../../shared/ui';
import { datasetsApi,type ImportOptions } from '../api/datasets-api';
import { CellDisplay } from './TypedTable';

type Props={disabled?:boolean}&({local?:false;projectId:string;onImported():Promise<void>}|{local:true;onImportLocal(file:File,options:ImportOptions,key:string):Promise<void>});
function optionsFor(delimiter:ImportOptions['delimiter'],overrides:Record<number,LogicalType>):ImportOptions{return {delimiter,...(Object.keys(overrides).length?{columnTypes:Object.entries(overrides).map(([position,logicalType])=>({position:Number(position),logicalType}))}:{})};}
function errorMessage(error:unknown){
  const message=error instanceof Error?error.message:'Không đọc được CSV';
  if(!(error instanceof ApiError||error instanceof DataError))return message;
  const issues=(error.details as {issues?:{code?:string;recordIndex?:number;lineStart?:number;lineEnd?:number;columnPosition?:number;message?:string}[]}|undefined)?.issues;
  return message+(issues?.length?' · '+issues.map(issue=>`${issue.code??''} · Record ${issue.recordIndex??'—'}, dòng ${issue.lineStart??'—'}–${issue.lineEnd??'—'}, cột ${issue.columnPosition??'—'}: ${issue.message??''}`).join('; '):'');
}
export function ImportWizard(props:Props){
  const id=useId(),input=useRef<HTMLInputElement>(null),inspection=useRef(0);
  const [file,setFile]=useState<File>(),[delimiter,setDelimiter]=useState<ImportOptions['delimiter']>(','),[preview,setPreview]=useState<Snapshot>(),[inferred,setInferred]=useState<Snapshot>(),[source,setSource]=useState<Uint8Array>();
  const [overrides,setOverrides]=useState<Record<number,LogicalType>>({}),[error,setError]=useState(''),[working,setWorking]=useState(false),[inspecting,setInspecting]=useState(false);
  const pending=useRef<{file:File;payload:string;key:string}|undefined>(undefined),submitting=useRef(false);
  const busy=working||!!props.disabled;
  async function inspect(next:File|undefined,separator:ImportOptions['delimiter']){
    const stamp=++inspection.current;setFile(next);setDelimiter(separator);setPreview(undefined);setInferred(undefined);setSource(undefined);setOverrides({});setError('');if(!next){setInspecting(false);return;}setInspecting(true);
    try{if(next.size>16_000_000)throw new Error('CSV vượt 16.000.000 byte');const bytes=new Uint8Array(await next.arrayBuffer());if(stamp!==inspection.current)return;const snapshot=importCsv(bytes,{delimiter:separator},()=>crypto.randomUUID());setSource(bytes);setInferred(snapshot);setPreview(snapshot);}
    catch(error){if(stamp===inspection.current)setError(errorMessage(error));}
    finally{if(stamp===inspection.current)setInspecting(false);}
  }
  function override(position:number,type:string){
    if(!source)return;const next={...overrides};if(type)next[position]=type as LogicalType;else delete next[position];setOverrides(next);setError('');
    try{setPreview(importCsv(source,optionsFor(delimiter,next),()=>crypto.randomUUID()));}catch(error){setPreview(undefined);setError(errorMessage(error));}
  }
  async function submit(event:FormEvent){
    event.preventDefault();if(!file||!preview||busy||inspecting||submitting.current)return;submitting.current=true;setWorking(true);setError('');
    const options=optionsFor(delimiter,overrides),payload=JSON.stringify(options);if(pending.current?.file!==file||pending.current.payload!==payload)pending.current={file,payload,key:crypto.randomUUID()};
    try{
      if(props.local){await props.onImportLocal(file,options,pending.current.key);setFile(undefined);setPreview(undefined);setInferred(undefined);setSource(undefined);setOverrides({});if(input.current)input.current.value='';}
      else{await datasetsApi.import(props.projectId,file,options,pending.current.key);await props.onImported();}
      pending.current=undefined;
    }catch(error){setError(errorMessage(error));}
    finally{submitting.current=false;setWorking(false);}
  }
  return <section aria-label={props.local?'Import CSV local':'Import CSV online'}><h2>{props.local?'Nhập CSV trên thiết bị':'Nhập dữ liệu CSV'}</h2><p className="muted">UTF-8 · dòng đầu là tên cột · tối đa 16.000.000 byte. File nguồn được giữ nguyên.</p><form onSubmit={event=>{void submit(event);}}>
    <div className="form-grid"><div className="field"><label htmlFor={`${id}-csv`}>{props.local?'File CSV':'File CSV online'}</label><input ref={input} id={`${id}-csv`} type="file" accept=".csv,text/csv" disabled={busy} onChange={event=>void inspect(event.target.files?.[0],delimiter)}/></div>
    <div className="field"><label htmlFor={`${id}-delimiter`}>Dấu phân cách</label><select id={`${id}-delimiter`} disabled={busy} value={delimiter} onChange={event=>void inspect(file,event.target.value as ImportOptions['delimiter'])}><option value=",">Dấu phẩy</option><option value=";">Chấm phẩy</option><option value={'\t'}>Tab</option></select></div></div>
    {inspecting&&<p aria-live="polite">Đang kiểm tra toàn bộ file CSV…</p>}
    {inferred&&<><p>{inferred.rows.length} dòng · {inferred.columns.length} cột. Chọn kiểu để override toàn cột; preview được tính lại từ nguyên file.</p><div className="schema-grid">{inferred.columns.map(column=><div className="field" key={column.columnId}><label htmlFor={`${id}-type-${column.position}`}>Kiểu cột {column.name||`Cột ${column.position+1}`}</label><select id={`${id}-type-${column.position}`} disabled={busy} value={overrides[column.position]??''} onChange={event=>override(column.position,event.target.value)}><option value="">Tự nhận diện ({column.logicalType})</option>{['number','text','date','datetime','boolean','mixed'].map(type=><option key={type}>{type}</option>)}</select></div>)}</div></>}
    {preview&&<div className="data-table" role="region" aria-label="Xem trước CSV"><p>Hiển thị tối đa 10 dòng đầu; việc kiểm kiểu đã chạy trên toàn bộ file.</p><table><thead><tr><th>#</th>{preview.columns.map(column=><th key={column.columnId}>{column.name}<small>{column.logicalType}</small></th>)}</tr></thead><tbody>{preview.rows.slice(0,10).map(row=><tr key={row.rowId}><th>{row.position+1}</th>{preview.columns.map(column=><td key={column.columnId}><CellDisplay cell={row.cells[column.columnId]}/></td>)}</tr>)}</tbody></table>{!preview.rows.length&&<p>CSV chỉ có header, chưa có dòng dữ liệu.</p>}</div>}
    {error&&<Feedback error>{error}</Feedback>}<Button disabled={busy||inspecting||!preview}>{working?'Đang lưu…':props.local?'Lưu offline':'Import lên server'}</Button>
  </form></section>;
}
