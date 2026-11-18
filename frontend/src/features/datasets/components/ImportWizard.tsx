import type { ImportWizardModel } from '../hooks/useImportWizard';

import { Button, Feedback } from '../../../shared/ui';
import { type ImportOptions } from '../api/datasets-api';
import { CellDisplay } from './TypedTable';

export function ImportWizard(model:ImportWizardModel){
  const {props,id,input,file,delimiter,preview,inferred,overrides,error,working,inspecting,busy,inspect,override,submit}=model;

return <section aria-label={props.local?'Import CSV local':'Import CSV online'}><h2>{props.local?'Nhập CSV trên thiết bị':'Nhập dữ liệu CSV'}</h2><p className="muted">UTF-8 · dòng đầu là tên cột · tối đa 16.000.000 byte. File nguồn được giữ nguyên.</p><form onSubmit={event=>{void submit(event);}}>
    <div className="form-grid"><div className="field"><label htmlFor={`${id}-csv`}>{props.local?'File CSV':'File CSV online'}</label><input ref={input} id={`${id}-csv`} type="file" accept=".csv,text/csv" disabled={busy} onChange={event=>void inspect(event.target.files?.[0],delimiter)}/></div>
    <div className="field"><label htmlFor={`${id}-delimiter`}>Dấu phân cách</label><select id={`${id}-delimiter`} disabled={busy} value={delimiter} onChange={event=>void inspect(file,event.target.value as ImportOptions['delimiter'])}><option value=",">Dấu phẩy</option><option value=";">Chấm phẩy</option><option value={'\t'}>Tab</option></select></div></div>
    {inspecting&&<p aria-live="polite">Đang kiểm tra toàn bộ file CSV…</p>}
    {inferred&&<><p>{inferred.rows.length} dòng · {inferred.columns.length} cột. Chọn kiểu để override toàn cột; preview được tính lại từ nguyên file.</p><div className="schema-grid">{inferred.columns.map(column=><div className="field" key={column.columnId}><label htmlFor={`${id}-type-${column.position}`}>Kiểu cột {column.name||`Cột ${column.position+1}`}</label><select id={`${id}-type-${column.position}`} disabled={busy} value={overrides[column.position]??''} onChange={event=>override(column.position,event.target.value)}><option value="">Tự nhận diện ({column.logicalType})</option>{['number','text','date','datetime','boolean','mixed'].map(type=><option key={type}>{type}</option>)}</select></div>)}</div></>}
    {preview&&<div className="data-table" role="region" aria-label="Xem trước CSV"><p>Hiển thị tối đa 10 dòng đầu; việc kiểm kiểu đã chạy trên toàn bộ file.</p><table><thead><tr><th>#</th>{preview.columns.map(column=><th key={column.columnId}>{column.name}<small>{column.logicalType}</small></th>)}</tr></thead><tbody>{preview.rows.slice(0,10).map(row=><tr key={row.rowId}><th>{row.position+1}</th>{preview.columns.map(column=><td key={column.columnId}><CellDisplay cell={row.cells[column.columnId]}/></td>)}</tr>)}</tbody></table>{!preview.rows.length&&<p>CSV chỉ có header, chưa có dòng dữ liệu.</p>}</div>}
    {error&&<Feedback error>{error}</Feedback>}<Button disabled={busy||inspecting||!preview}>{working?'Đang lưu…':props.local?'Lưu offline':'Import lên server'}</Button>
  </form></section>;
}
