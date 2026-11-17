import { useId,useState } from 'react';
import type { Cell,Column,Row,RowFilter,TableState,Selection } from '@dashboard/data-core';
import { Button,Feedback } from '../../../shared/ui';
import { TypedTable } from './TypedTable';
export interface TableRows {rows:Row[];totalRows:number;filteredRows:number;totalPages:number}
function valueFor(kind:Cell['kind'],input:string):Cell{
  if(kind==='null')return {kind,value:null};
  if(kind==='number'){const value=Number(input);if(!input.trim()||!Number.isFinite(value)||Number.isInteger(value)&&!Number.isSafeInteger(value))throw new Error('Nhập số hữu hạn và trong độ chính xác cho filter');return {kind,value};}
  if(kind==='boolean'){if(!['true','false'].includes(input))throw new Error('Filter boolean chỉ nhận true hoặc false');return {kind,value:input==='true'};}
  if(kind==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(input)||!Number.isFinite(Date.parse(input))||new Date(input).toISOString().slice(0,10)!==input))throw new Error('Filter ngày cần YYYY-MM-DD hợp lệ');
  if(kind==='datetime'&&(!/^\d{4}-\d{2}-\d{2}T/.test(input)||!Number.isFinite(Date.parse(input))))throw new Error('Filter datetime cần ISO8601 hợp lệ');
  return {kind,value:kind==='datetime'?new Date(input).toISOString():input};
}
export function DataTableView({columns,data,state,selected,onState,onSelect,onEdit,title='Bảng dữ liệu'}:{columns:Column[];data?:TableRows;state:TableState;selected:Selection['cell'];onState(state:TableState):void;onSelect(rowId:string,columnId:string):void;onEdit?(rowId:string,columnId:string):void;title?:string}){
  const id=useId();
  const [column,setColumn]=useState(''),[op,setOp]=useState('contains'),[input,setInput]=useState(''),[kind,setKind]=useState<Cell['kind']>(),[error,setError]=useState('');
  const target=columns.find(item=>item.columnId===column)??columns[0],missing=['isMissing','isNotMissing'].includes(op);
  const filterKind=kind??(target?.logicalType==='mixed'?'text':target?.logicalType??'text');
  function filter(append=false){if(!target)return;try{
    const value=missing?undefined:valueFor(op==='contains'?'text':filterKind,input);
    const condition={columnId:target.columnId,op,...(value?{value}:{})} as RowFilter;
    onState({...state,page:1,filters:append?[...state.filters,condition]:[condition]});setError('');
  }catch(error){setError(error instanceof Error?error.message:'Filter không hợp lệ');}}
  return <section><div className="toolbar"><h2>{title}</h2><label htmlFor={`${id}-page-size`}>Số dòng/trang</label><select id={`${id}-page-size`} value={state.pageSize} onChange={event=>onState({...state,page:1,pageSize:Number(event.target.value)})}>{[10,25,50,100].map(size=><option key={size}>{size}</option>)}</select><label htmlFor={`${id}-sort`}>Sắp xếp</label><select id={`${id}-sort`} value={state.sort?`${state.sort.columnId}:${state.sort.direction}`:''} onChange={event=>{const [columnId,direction]=event.target.value.split(':');onState({...state,page:1,sort:columnId?{columnId,direction:direction as 'asc'|'desc'}:null});}}><option value="">Thứ tự gốc</option>{columns.flatMap(column=>['asc','desc'].map(direction=><option key={`${column.columnId}:${direction}`} value={`${column.columnId}:${direction}`}>{column.name} {direction==='asc'?'↑':'↓'}</option>))}</select></div>
    <div className="toolbar"><select aria-label="Cột filter" value={target?.columnId??''} onChange={event=>{setColumn(event.target.value);setKind(undefined);}}>{columns.map(column=><option key={column.columnId} value={column.columnId}>{column.name}</option>)}</select><select aria-label="Điều kiện filter" value={op} onChange={event=>setOp(event.target.value)}>{['contains','eq','ne','lt','lte','gt','gte','isMissing','isNotMissing'].map(op=><option key={op}>{op}</option>)}</select><select aria-label="Kiểu giá trị filter" disabled={missing||op==='contains'} value={op==='contains'?'text':filterKind} onChange={event=>setKind(event.target.value as Cell['kind'])}>{['text','number','boolean','date','datetime','null'].map(type=><option key={type}>{type}</option>)}</select><input aria-label="Giá trị filter" value={input} disabled={missing||filterKind==='null'&&op!=='contains'} onChange={event=>setInput(event.target.value)}/><Button variant="secondary" disabled={!target} onClick={()=>filter()}>Lọc</Button><Button variant="secondary" disabled={!target} onClick={()=>filter(true)}>Thêm điều kiện</Button><Button variant="secondary" onClick={()=>{setError('');onState({...state,page:1,filters:[]});}}>Bỏ lọc</Button></div>
    {state.filters.length>0&&<ul className="filter-list">{state.filters.map((filter,index)=><li key={index}>{columns.find(column=>column.columnId===filter.columnId)?.name??filter.columnId} {filter.op}{'value'in filter?` · ${filter.value.kind}: ${JSON.stringify(filter.value.value)}`:''}<Button variant="secondary" aria-label={`Xóa điều kiện ${index+1}`} onClick={()=>onState({...state,page:1,filters:state.filters.filter((_,i)=>i!==index)})}>×</Button></li>)}</ul>}
    {error&&<Feedback error>{error}</Feedback>}
    {data?<TypedTable columns={columns} rows={data.rows} selected={selected} onSelect={onSelect} onEdit={onEdit}/>:<p>Đang đọc bảng…</p>}
    <div className="pagination"><Button variant="secondary" disabled={state.page<=1} onClick={()=>onState({...state,page:state.page-1})}>Trang trước</Button><span>Trang {state.page}/{Math.max(1,data?.totalPages??1)} · {data?.filteredRows??0}/{data?.totalRows??0} dòng</span><Button variant="secondary" disabled={state.page>=(data?.totalPages??1)} onClick={()=>onState({...state,page:state.page+1})}>Trang sau</Button></div>
    <p className="muted">Để sửa một ô: mở Không gian 3D, chọn điểm rồi sửa trực tiếp trong bảng dữ liệu của dòng. Các filter kết hợp AND; không giới hạn phạm vi xử lý hay thống kê.</p>
  </section>;
}
