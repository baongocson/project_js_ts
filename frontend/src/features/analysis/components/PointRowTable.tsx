import { usePointRowEditor, type PointRowEditorProps } from '../hooks/usePointRowEditor';

import type { Cell } from '@dashboard/data-core';

import { CellDisplay } from '../../datasets';
import { Button, Feedback } from '../../../shared/ui';

/** Editing is attached to the picked row. Preview/Apply remain an internal atomic user action. */
export function PointRowTable(props:PointRowEditorProps){
  const {row,columns,editor,draft,setDraft,busy,error,setError,message,uncertain,pendingColumn,get,change,save}=usePointRowEditor(props);

return <div className="row-inspector" data-testid="analysis-selected-row"><h3>Dòng {row.position+1} · Chỉnh sửa trực tiếp</h3><p>Lưu từng ô; hãy lưu hoặc bỏ thay đổi trước khi sửa ô tiếp theo.</p><p className="muted">Đọc theo rowId, độc lập filter và trang bảng: {row.rowId}</p>
    <div className="data-table"><table><thead><tr><th>Cột</th><th>Giá trị hiện tại</th>{editor&&<><th>Sửa giá trị</th><th>Lưu</th></>}</tr></thead><tbody>{columns.map(column=>{
      const value=get(column.columnId),pending=pendingColumn===column.columnId,otherDraft=Object.keys(draft).some(id=>id!==column.columnId),disabled=busy||uncertain||otherDraft;
      return <tr key={column.columnId}><th>{column.name}<small>{column.logicalType}</small></th><td><CellDisplay cell={row.cells[column.columnId]}/></td>{editor&&<><td>
        <select aria-label={`Kiểu ô ${column.name}`} value={value.kind} disabled={disabled} onChange={event=>change(column.columnId,{kind:event.target.value as Cell['kind'],value:event.target.value==='boolean'?'false':event.target.value==='null'?'':value.value})}>
          {['text','number','date','datetime','boolean','null'].map(kind=><option key={kind}>{kind}</option>)}
        </select>
        {value.kind==='boolean'?<select aria-label={`Sửa ô ${column.name}`} disabled={disabled} value={value.value} onChange={event=>change(column.columnId,{value:event.target.value})}><option>true</option><option>false</option></select>
          :<input aria-label={`Sửa ô ${column.name}`} disabled={disabled||value.kind==='null'} value={value.value} onChange={event=>change(column.columnId,{value:event.target.value})} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void save(column.columnId);}}}/>}
      </td><td><Button disabled={busy||uncertain&&!pending||!draft[column.columnId]&&!pending} onClick={()=>void save(column.columnId)}>{uncertain&&pending?`Kiểm tra lại lưu ô ${column.name}`:`Lưu ô ${column.name}`}</Button></td></>}</tr>;
    })}</tbody></table></div>
    {Object.keys(draft).length>0&&!uncertain&&<Button variant="secondary" disabled={busy} onClick={()=>{setDraft({});setError('');}}>Bỏ thay đổi chưa lưu</Button>}
    {uncertain&&<p className="notice">Chưa xác nhận được lần lưu. Kiểm tra lại giữ nguyên khóa, không tạo thao tác trùng.</p>}
    {error&&<Feedback error>{error}</Feedback>}{message&&<p className="notice">{message}</p>}
  </div>;
}
