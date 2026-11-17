import { missingKind,type Column,type Row,type Cell } from '@dashboard/data-core';
export function CellDisplay({cell}:{cell:Cell|undefined}){
  if(!cell)return <span className="muted">Không có ô</span>;
  const missing=missingKind(cell);
  if(missing)return <span className="cell-missing" title={JSON.stringify(cell.value)}>{({null:'null',empty:'Chuỗi rỗng',whitespace:'Khoảng trắng',n_a:'N/A'})[missing]}</span>;
  return <span className={`cell-${cell.kind}`} title={`${cell.kind}: ${String(cell.value)}`}>{cell.kind==='boolean'?(cell.value?'true':'false'):String(cell.value)}</span>;
}
export function TypedTable({columns,rows,selected,onSelect,onEdit}:{columns:Column[];rows:Row[];selected:{rowId:string;columnId:string}|null;onSelect(rowId:string,columnId:string):void;onEdit?(rowId:string,columnId:string):void}){
  return <div className="data-table" role="region" tabIndex={0} aria-label="Bảng dữ liệu"><table><thead><tr><th>#</th>{columns.map(column=><th key={column.columnId}>{column.name||'(không tên)'}<small>{column.logicalType}</small></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.rowId}><th scope="row">{row.position+1}</th>{columns.map(column=><td key={column.columnId} className={selected?.rowId===row.rowId&&selected.columnId===column.columnId?'selected':''}><button className="cell-button" aria-label={`Dòng ${row.position+1}, cột ${column.name}`} aria-pressed={selected?.rowId===row.rowId&&selected.columnId===column.columnId} onClick={()=>onSelect(row.rowId,column.columnId)} onDoubleClick={()=>onEdit?.(row.rowId,column.columnId)}><CellDisplay cell={row.cells[column.columnId]}/></button></td>)}</tr>)}</tbody></table>{rows.length===0&&<p className="empty-state">Không có dòng phù hợp.</p>}</div>;
}
