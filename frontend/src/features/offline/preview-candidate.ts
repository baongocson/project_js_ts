import { sameCell,type Snapshot,type Column,type Row } from '@dashboard/data-core';
import type { Preview,PreviewChange } from '../processing';
import { SyncHttpError } from './types';

function mismatch():never{throw new SyncHttpError(409,'SYNC_PREVIEW_MISMATCH','Nội dung preview server khác bản local; chưa Apply, dữ liệu local được giữ');}
function cellsEqual(left:Row['cells'],right:Row['cells']):boolean{
  const ids=Object.keys(left);return ids.length===Object.keys(right).length&&ids.every(id=>!!right[id]&&sameCell(left[id],right[id]));
}
/** Reconstruct the unpublished server candidate, with strict diff completeness checks. */
export function previewCandidate(base:Snapshot,preview:Preview,changes:PreviewChange[]):Snapshot{
  if(preview.summary.before.rowCount!==base.rows.length||preview.summary.before.columnCount!==base.columns.length)mismatch();
  const columns=new Map(base.columns.map(column=>[column.columnId,structuredClone(column)]));
  const touched=new Set<string>();
  function touch(id:string){if(touched.has(id))mismatch();touched.add(id);}
  for(const column of preview.schemaChanges.removed){touch(column.columnId);if(JSON.stringify(columns.get(column.columnId))!==JSON.stringify(column))mismatch();columns.delete(column.columnId);}
  for(const item of preview.schemaChanges.modified){touch(item.columnId);if(JSON.stringify(columns.get(item.columnId))!==JSON.stringify(item.before)||item.after.columnId!==item.columnId)mismatch();columns.set(item.columnId,item.after);}
  for(const column of preview.schemaChanges.added){touch(column.columnId);if(columns.has(column.columnId))mismatch();columns.set(column.columnId,column);}
  const ordered:Column[]=[...columns.values()].sort((a,b)=>a.position-b.position);
  if(ordered.length!==preview.summary.after.columnCount||ordered.some((column,index)=>column.position!==index))mismatch();
  const rows=new Map(base.rows.map(row=>[row.rowId,structuredClone(row)])),rowIds=new Set<string>();
  changes.forEach((change,index)=>{
    if(change.ordinal!==index||rowIds.has(change.rowId))mismatch();rowIds.add(change.rowId);
    const before=rows.get(change.rowId);
    if(before){if(change.beforePosition!==before.position||!change.beforeCells||!cellsEqual(before.cells,change.beforeCells)||change.changeKind==='inserted')mismatch();}
    else if(change.changeKind!=='inserted'||change.beforePosition!==null||change.beforeCells!==null)mismatch();
    if(change.changeKind==='deleted'){
      if(change.afterPosition!==null||change.afterCells!==null)mismatch();rows.delete(change.rowId);
    }else{
      if(!Number.isSafeInteger(change.afterPosition)||change.afterPosition!<0||!change.afterCells)mismatch();
      rows.set(change.rowId,{rowId:change.rowId,position:change.afterPosition!,cells:change.afterCells!});
    }
  });
  const output=[...rows.values()].sort((a,b)=>a.position-b.position);
  if(output.length!==preview.summary.after.rowCount||output.some((row,index)=>row.position!==index||Object.keys(row.cells).length!==ordered.length||ordered.some(column=>!row.cells[column.columnId])))mismatch();
  return {columns:ordered,rows:output};
}
