import type { ProcessingModel } from '../hooks/useProcessing';

import { createPortal } from 'react-dom';
import type { ProcessingMethod, Scope } from '@dashboard/data-core';
import { Button, Feedback } from '../../../shared/ui';

import { allowedScopes, labels, methodGroups } from '../methods';
import { MethodParameters } from './MethodParameters';
import { PreviewView } from './PreviewView';

import { AiSuggestionsPanel } from './AiSuggestionsPanel';

export type { ProcessingAdapter } from '../types';

export function ProcessingPanel(model:ProcessingModel){
  const {adapter,columns,selectedCell,local,group,previewHost,method,parameters,setParameters,scopeType,setScopeType,columnIds,setColumnIds,result,error,message,busy,advanced,setAdvanced,advancedEnabled,setAdvancedEnabled,retryApply,previewLoaded,stale,expired,work,selectMethod,preview,previewSuggestion,page,cancelPreview,loadCategories,apply}=model;

  const previewView=result&&<div className="preview-stage" data-testid="processing-preview"><div className="panel-heading"><p className="eyebrow">PREVIEW · BEFORE / AFTER</p><h2>Xem trước thay đổi</h2></div>{stale&&<p className="notice">Tham số hoặc ô chọn đã đổi; tạo preview mới trước khi Apply.</p>}{expired&&<p className="notice">Preview đã hết hạn. Tạo preview mới; yêu cầu Apply đã gửi vẫn có thể kiểm tra lại receipt.</p>}
      <PreviewView {...result} columns={columns} onPage={number=>void work(()=>page(number))}/>
      <Button disabled={busy||(!retryApply&&(!previewLoaded||stale||expired||!result.preview.canApply||result.preview.status!=='ready'))} onClick={()=>void work(apply)}>{retryApply?'Kiểm tra lại Apply':local?'Áp dụng offline':'Áp dụng thay đổi'}</Button>
      {' '}<Button variant="secondary" disabled={busy||retryApply} onClick={cancelPreview}>Hủy bản xem trước</Button>
    </div>;
  return <section aria-label="Xử lý dữ liệu"><h2>{local?'Xử lý bản local':'Xử lý dữ liệu'}</h2><p className="muted">Xem trước để kiểm tra; chỉ Apply mới tạo phiên bản. Thống kê tính trên toàn cột. Bộ lọc bảng không giới hạn phạm vi xử lý.</p>
    <AiSuggestionsPanel adapter={adapter} group={group} columns={columns} locked={busy||retryApply} onPreview={spec=>void work(()=>previewSuggestion(spec))}/>
    <fieldset disabled={busy||retryApply}><legend>Phương pháp và phạm vi</legend><div className="form-grid"><div className="field"><label htmlFor="processing-method">Phương pháp</label><select id="processing-method" value={method} onChange={event=>selectMethod(event.target.value as ProcessingMethod)}>{methodGroups[group].map(key=><option key={key} value={key}>{key} · {labels[key as ProcessingMethod]}</option>)}</select></div><div className="field"><label htmlFor="processing-scope">Phạm vi</label><select id="processing-scope" value={scopeType} onChange={event=>setScopeType(event.target.value as Scope['type'])}>{allowedScopes(method).map(type=><option key={type} value={type}>{type==='cell'?'Ô đang chọn':type==='columns'?'Các cột chọn':'Toàn dataset'}</option>)}</select></div></div>
    {scopeType==='columns'&&<div className="field"><label htmlFor="processing-columns">Các cột xử lý</label><select id="processing-columns" multiple value={columnIds} onChange={event=>setColumnIds(Array.from(event.target.selectedOptions,item=>item.value))}>{columns.map(column=><option key={column.columnId} value={column.columnId}>{column.name}</option>)}</select><small>Ctrl/Cmd để chọn nhiều cột; ordinal chỉ một cột.</small></div>}
    {scopeType==='cell'&&<p>{selectedCell?`Ô được chọn: dòng ${selectedCell.rowId}, cột ${columns.find(column=>column.columnId===selectedCell.columnId)?.name??selectedCell.columnId}`:'Chọn một ô ở bảng trước.'}</p>}
    <MethodParameters method={method} parameters={parameters} onChange={setParameters} busy={busy} loadCategories={method==='ordinal'?()=>work(loadCategories):undefined}/>
    <details><summary>Tham số JSON nâng cao</summary><label className="check"><input type="checkbox" checked={advancedEnabled} onChange={event=>{setAdvancedEnabled(event.target.checked);setAdvanced(JSON.stringify(parameters,null,2));}}/>Dùng JSON thay cho form</label><label htmlFor="processing-json">Tham số xử lý (JSON)</label><textarea id="processing-json" disabled={!advancedEnabled} value={advanced} onChange={event=>setAdvanced(event.target.value)}/></details></fieldset>
    <div className="toolbar"><Button disabled={busy||retryApply} onClick={()=>void work(preview)}>Xem trước thay đổi</Button>{result&&<Button variant="secondary" disabled={busy} onClick={()=>void work(()=>page(result.page))}>Tải lại preview</Button>}</div>
    {error&&<Feedback error>{error}</Feedback>}{message&&<p className="notice">{message}</p>}
    {previewView&&(previewHost?createPortal(previewView,previewHost):previewView)}
  </section>;
}
