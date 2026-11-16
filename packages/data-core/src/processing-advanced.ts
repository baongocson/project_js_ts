/** Deterministic, pure advanced operations. Does not mutate source snapshots. */
import { acceptsCell, cellKey, missingKind, sameCell } from './cell.js';
import { compareCells } from './query.js';
import type { Cell, LogicalType, Snapshot, Row, Column } from './types.js';
import type { EngineResult, Diagnostic, ChangedCell, SchemaChange, ProcessingSpecification, ProcessingMethod } from './processing.js';

type AdvancedSpec = Extract<ProcessingSpecification, { method: Exclude<ProcessingMethod,
  'edit_cell'|'remove_duplicates'|'strip_html'|'normalize_whitespace'|'uppercase'|'lowercase'|'replace_value'|'convert_number'|'convert_text'|'convert_date'|'convert_datetime'|'convert_boolean'|'fill_constant'> }>;
const numericMethods = new Set(['fill_mean','fill_median','clip_iqr','clip_zscore','scale_minmax','standardize','log1p','square']);
const fillMethods = new Set(['fill_mean','fill_median','fill_mode','fill_max']);
const rowMethods = new Set(['drop_missing_rows']);
const columnMethods = new Set(['drop_missing_columns','one_hot','ordinal']);
const err = (code:string,message:string,columnId?:string,rowId?:string):Diagnostic => ({code,message,...(columnId ? {columnId}:{}),...(rowId ? {rowId}:{})});
const bad = (snapshot:Snapshot,errors:Diagnostic[]):EngineResult => ({snapshot,changes:[],schemaChanges:[],errors,warnings:[],canApply:false});
function done(source:Snapshot,candidate:Snapshot,changes:ChangedCell[],schemaChanges:SchemaChange[],changed:boolean):EngineResult {
  return {snapshot:changed?{ columns: candidate.columns.map((c,i)=>c.position===i?c:{...c,position:i}), rows: candidate.rows.map((r,i)=>r.position===i?r:{...r,position:i}) }:source,changes,schemaChanges,errors:[],warnings:changed?[]:[err('NO_CHANGES_DETECTED','Không có thay đổi')],canApply:changed};
}
function percentile(sorted:number[],fraction:number):number {
  const index=(sorted.length-1)*fraction, low=Math.floor(index), upper=Math.ceil(index);
  return sorted[low]+(sorted[upper]-sorted[low])*(index-low);
}
function numbers(snapshot:Snapshot,columnId:string):number[]|undefined {
  const result:number[]=[];
  for(const row of snapshot.rows){
    const cell=row.cells[columnId];
    if(!cell)return undefined;
    if(missingKind(cell)!==undefined)continue;
    if(cell.kind!=='number'||!Number.isFinite(cell.value))return undefined;
    result.push(cell.value);
  }
  return result;
}
function categories(snapshot:Snapshot,columnId:string):Cell[]|undefined {
  const values=new Map<string,Cell>();
  for(const row of snapshot.rows){
    const cell=row.cells[columnId];if(!cell)return undefined;
    if(missingKind(cell)===undefined)values.set(cellKey(cell),cell);
  }
  return [...values.values()].sort((a,b)=>compareCells(a,b));
}
function stableUuid(text:string):string {
  const hash=(seed:number):string=>{let h=seed>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');};
  const h=hash(2166136261)+hash(2166136261^0x9e3779b9)+hash(2166136261^0x85ebca6b)+hash(2166136261^0xc2b2ae35);
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
const numeric=(value:number):Cell=>({kind:'number',value});
function distinctName(base: string, used: Set<string>): string {
  let name = base, suffix = 2;
  while (used.has(name)) name = `${base}_${suffix++}`;
  used.add(name);
  return name;
}
export function processAdvanced(snapshot:Snapshot, raw:ProcessingSpecification):EngineResult {
  const spec=raw as AdvancedSpec;
  const {scope}=spec;
  const columnsById=new Map(snapshot.columns.map(c=>[c.columnId,c]));
  const selected=scope.type==='cell'?[scope.columnId]:scope.type==='columns'?scope.columnIds:snapshot.columns.map(c=>c.columnId);
  const errors:Diagnostic[]=[];
  if(scope.type==='cell'&&!snapshot.rows.some(r=>r.rowId===scope.rowId))errors.push(err('ROW_NOT_FOUND','Dòng không tồn tại',undefined,scope.rowId));
  for(const id of selected)if(!columnsById.has(id))errors.push(err('COLUMN_NOT_FOUND','Cột không tồn tại',id));
  if((rowMethods.has(spec.method)||columnMethods.has(spec.method))&&scope.type==='cell')errors.push(err('INVALID_SCOPE','Phương pháp không hỗ trợ scope cell'));
  if(spec.method==='ordinal'&&(scope.type!=='columns'||selected.length!==1))errors.push(err('INVALID_SCOPE','Ordinal yêu cầu một cột'));
  if(spec.method==='drop_missing_rows'||spec.method==='drop_missing_columns') {
    if(spec.parameters.condition!=='any'&&spec.parameters.condition!=='all')errors.push(err('INVALID_PARAMETERS','condition không hợp lệ'));
  }
  if(spec.method==='clip_iqr'&&(!Number.isFinite(spec.parameters.factor)||spec.parameters.factor<=0))errors.push(err('INVALID_PARAMETERS','factor phải dương'));
  if(spec.method==='clip_zscore'&&(!Number.isFinite(spec.parameters.threshold)||spec.parameters.threshold<=0))errors.push(err('INVALID_PARAMETERS','threshold phải dương'));
  if(spec.method==='scale_minmax'&&(!Number.isFinite(spec.parameters.rangeMin)||!Number.isFinite(spec.parameters.rangeMax)||spec.parameters.rangeMin>=spec.parameters.rangeMax))errors.push(err('INVALID_PARAMETERS','Khoảng scale không hợp lệ'));
  if(errors.length)return bad(snapshot,errors);
  if(spec.method==='drop_missing_rows') {
    const kept=snapshot.rows.filter(row=>{
      const checks=selected.map(id=>row.cells[id]&&missingKind(row.cells[id])!==undefined);
      return !(spec.parameters.condition==='any'?checks.some(Boolean):checks.length>0&&checks.every(Boolean));
    });
    return done(snapshot,{columns:snapshot.columns,rows:kept},[],[],kept.length!==snapshot.rows.length);
  }
  if(spec.method==='drop_missing_columns') {
    const removed=new Set(selected.filter(id=>{
      const checks=snapshot.rows.map(row=>row.cells[id]&&missingKind(row.cells[id])!==undefined);
      return spec.parameters.condition==='any'?checks.some(Boolean):checks.length>0&&checks.every(Boolean);
    }));
    if(removed.size===0)return done(snapshot,snapshot,[],[],false);
    if(removed.size===snapshot.columns.length)return bad(snapshot,[err('EMPTY_SCHEMA_NOT_ALLOWED','Dataset phải còn ít nhất một cột')]);
    const columns=snapshot.columns.filter(c=>!removed.has(c.columnId));
    const rows=snapshot.rows.map(row=>({ ...row,cells:Object.fromEntries(Object.entries(row.cells).filter(([id])=>!removed.has(id))) }));
    return done(snapshot,{columns,rows},[],[],true);
  }
  if(spec.method==='one_hot'||spec.method==='ordinal')return encode(snapshot,spec,selected,errors);
  const derived=new Map<string,{target?:Cell; transform?:(n:number)=>number; logicalType?:LogicalType}>();
  for(const id of selected){
    if(numericMethods.has(spec.method)||spec.method==='fill_max'){
      const vals=numbers(snapshot,id);
      if(!vals){errors.push(err('NON_NUMERIC_COLUMN','Cột chứa giá trị không phải số',id));continue;}
      if(vals.length===0){errors.push(err('ALL_MISSING_COLUMN','Cột không có giá trị hợp lệ',id));continue;}
      const sorted=[...vals].sort((a,b)=>a-b),min=sorted[0],max=sorted[sorted.length-1];
      const mean=vals.reduce((sum,n)=>sum+n,0)/vals.length;
      const variance=vals.reduce((sum,n)=>sum+(n-mean)**2,0)/vals.length;
      const std=Math.sqrt(variance);
      if(spec.method==='fill_max')derived.set(id,{target:numeric(max)});
      if(spec.method==='fill_mean')derived.set(id,{target:numeric(mean)});
      if(spec.method==='fill_median')derived.set(id,{target:numeric(percentile(sorted,0.5))});
      if(spec.method==='clip_iqr'){
        const q1=percentile(sorted,0.25),q3=percentile(sorted,0.75),iqr=q3-q1;
        if(iqr===0){errors.push(err('ZERO_SPREAD','IQR bằng 0',id));continue;}
        const lo=q1-spec.parameters.factor*iqr,hi=q3+spec.parameters.factor*iqr;
        derived.set(id,{transform:n=>Math.max(lo,Math.min(hi,n))});
      }
      if(spec.method==='clip_zscore'){
        if(std===0){errors.push(err('ZERO_VARIANCE','Độ lệch chuẩn bằng 0',id));continue;}
        const lo=mean-spec.parameters.threshold*std,hi=mean+spec.parameters.threshold*std;
        derived.set(id,{transform:n=>Math.max(lo,Math.min(hi,n))});
      }
      if(spec.method==='scale_minmax'){
        if(max===min){errors.push(err('ZERO_SPREAD','Khoảng biến thiên bằng 0',id));continue;}
        derived.set(id,{transform:n=>spec.parameters.rangeMin+(n-min)/(max-min)*(spec.parameters.rangeMax-spec.parameters.rangeMin)});
      }
      if(spec.method==='standardize'){
        if(std===0){errors.push(err('ZERO_VARIANCE','Độ lệch chuẩn bằng 0',id));continue;}
        derived.set(id,{transform:n=>(n-mean)/std});
      }
      if(spec.method==='log1p')derived.set(id,{transform:n=>Math.log1p(n)});
      if(spec.method==='square')derived.set(id,{transform:n=>n*n});
    }else if(spec.method==='fill_mode'){
      const cats=categories(snapshot,id);
      if(!cats){errors.push(err('CELL_NOT_FOUND','Ô không tồn tại',id));continue;}
      if(cats.length===0){errors.push(err('ALL_MISSING_COLUMN','Cột toàn missing',id));continue;}
      const freq=new Map<string,number>();
      for(const row of snapshot.rows){const c=row.cells[id];if(c&&missingKind(c)===undefined)freq.set(cellKey(c),(freq.get(cellKey(c))??0)+1);}
      let winner=cats[0],count=-1;
      for(const c of cats){const current=freq.get(cellKey(c))??0;if(current>count){winner=c;count=current;}}
      derived.set(id,{target:winner});
    }
  }
  if(errors.length)return bad(snapshot,errors);
  const changes:ChangedCell[]=[];
  const rows:Row[]=snapshot.rows.map(row=>{
    if(scope.type==='cell'&&scope.rowId!==row.rowId)return row;
    let updated:Record<string,Cell>|undefined;
    for(const id of selected){
      const before=row.cells[id];if(!before){errors.push(err('CELL_NOT_FOUND','Ô không tồn tại',id,row.rowId));continue;}
      const info=derived.get(id);if(!info)continue;
      const missing=missingKind(before)!==undefined;
      let after:Cell=before;
      if(fillMethods.has(spec.method)){if(missing)after=info.target??before;}
      else if(!missing&&before.kind==='number'&&info.transform){
        const value=info.transform(before.value);
        if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER){errors.push(err('INVALID_NUMERIC_RESULT','Kết quả số không hợp lệ',id,row.rowId));continue;}
        after=numeric(value);
      }
      if(sameCell(before,after))continue;
      const logical=columnsById.get(id)!.logicalType;
      if(!acceptsCell(logical,after)){errors.push(err('CELL_TYPE_MISMATCH','Sai kiểu cột',id,row.rowId));continue;}
      updated??={...row.cells};updated[id]=after;
      changes.push({rowId:row.rowId,columnId:id,before:{...before},after:{...after}});
    }
    return updated?{...row,cells:updated}:row;
  });
  return errors.length?bad(snapshot,errors):done(snapshot,{columns:snapshot.columns,rows},changes,[],changes.length>0);
}
function encode(snapshot:Snapshot,spec:Extract<AdvancedSpec,{method:'one_hot'|'ordinal'}>,selected:string[],errors:Diagnostic[]):EngineResult {
  if(spec.method==='ordinal'){
    const id=selected[0],mapping=spec.parameters.mapping;
    if(!Array.isArray(mapping)||mapping.length>5000)return bad(snapshot,[err('INVALID_MAPPING','Mapping không hợp lệ',id)]);
    const map=new Map<string,number>();const labels=new Set<number>();
    for(const item of mapping){
      if(!item||missingKind(item.value)!==undefined||!Number.isFinite(item.label)||Math.abs(item.label)>Number.MAX_SAFE_INTEGER||map.has(cellKey(item.value))||labels.has(item.label))return bad(snapshot,[err('INVALID_MAPPING','Mapping trùng hoặc không hợp lệ',id)]);
      map.set(cellKey(item.value),item.label);labels.add(item.label);
    }
    const base=snapshot.columns.find(c=>c.columnId===id)!;
    const realCategories = categories(snapshot, id);
    if (!realCategories) return bad(snapshot, [err('CELL_NOT_FOUND', 'Ô không tồn tại', id)]);
    if (realCategories.some(cell => !map.has(cellKey(cell))))
      return bad(snapshot, [err('UNMAPPED_CATEGORY', 'Category chưa mapping', id)]);
    if (map.size !== realCategories.length)
      return bad(snapshot, [err('INVALID_MAPPING', 'Mapping có category không thuộc cột', id)]);
    const newId=spec.parameters.keepSource?stableUuid(`${id}:ordinal`):id;
    if(newId!==id&&snapshot.columns.some(c=>c.columnId===newId))return bad(snapshot,[err('COLUMN_ID_CONFLICT','ID cột trùng',newId)]);
    const newColumn:Column={columnId:newId,name:spec.parameters.keepSource?distinctName(`${base.name}_ordinal`, new Set(snapshot.columns.map(column=>column.name))):base.name,position:base.position+(spec.parameters.keepSource?0.5:0),logicalType:'number',format:null,lineage:{sourceColumnId:id}};
    const changes:ChangedCell[]=[];
    const rows=snapshot.rows.map(row=>{
      const cell=row.cells[id];if(!cell){errors.push(err('CELL_NOT_FOUND','Ô không tồn tại',id,row.rowId));return row;}
      const value=missingKind(cell)!==undefined?{...cell} as Cell:map.has(cellKey(cell))?numeric(map.get(cellKey(cell))!):undefined;
      if(!value){errors.push(err('UNMAPPED_CATEGORY','Category chưa mapping',id,row.rowId));return row;}
      if(!spec.parameters.keepSource&&!sameCell(cell,value))changes.push({rowId:row.rowId,columnId:id,before:cell,after:value});
      return {...row,cells:{...row.cells,[newId]:value}};
    });
    if(errors.length)return bad(snapshot,errors);
    const cols=spec.parameters.keepSource?[...snapshot.columns,newColumn].sort((a,b)=>a.position-b.position):snapshot.columns.map(c=>c.columnId===id?newColumn:c);
    const schemaChanges:SchemaChange[]=spec.parameters.keepSource?[]:[{columnId:id,before:base.logicalType,after:'number'}];
    return done(snapshot,{columns:cols,rows},changes,schemaChanges,snapshot.rows.length>0||schemaChanges.length>0||spec.parameters.keepSource);
  }
  const planned:{source:string;sourceName:string;categories:Cell[];includeMissing:boolean;columns:Column[]}[]=[];
  let generated=0;
  const taken=new Set(snapshot.columns.map(c=>c.columnId));
  const names=new Set(snapshot.columns.map(c=>c.name));
  for(const id of selected){
    const base=snapshot.columns.find(c=>c.columnId===id)!;
    const cats=categories(snapshot,id);
    if(!cats){errors.push(err('CELL_NOT_FOUND','Ô không tồn tại',id));continue;}
    if (base.logicalType !== 'text' && base.logicalType !== 'boolean' && !(base.logicalType === 'number' && spec.parameters.asCategory)) {
      errors.push(err('UNSUPPORTED_CATEGORY_TYPE', 'One-hot chỉ hỗ trợ text/boolean hoặc number khi asCategory=true', id)); continue;
    }
    const missing=spec.parameters.missingCategory&&snapshot.rows.some(r=>missingKind(r.cells[id])!==undefined);
    if(cats.length+(missing?1:0)>100){errors.push(err('TOO_MANY_CATEGORIES','Quá 100 category',id));continue;}
    const generatedColumns=[...cats,...(missing?[{kind:'null',value:null} as Cell]:[])].map((c,i)=>{
      const category=cellKey(c),newId=stableUuid(`${id}:onehot:${category}`);
      if(taken.has(newId)){errors.push(err('COLUMN_ID_CONFLICT','Trùng ID cột',id));}
      taken.add(newId);
      return {columnId:newId,name:distinctName(`${base.name}_${missingKind(c)!==undefined?'missing':String(c.value)}`,names),position:base.position+(i+1)/(cats.length+2),logicalType:'number' as const,format:null,lineage:{sourceColumnId:id,category:missingKind(c)!==undefined?{isMissing:true as const}:c}};
    });
    generated+=generatedColumns.length;
    planned.push({source:id,sourceName:base.name,categories:cats,includeMissing:missing,columns:generatedColumns});
  }
  if(errors.length)return bad(snapshot,errors);
  if(generated===0)return done(snapshot,snapshot,[],[],false);
  if(snapshot.columns.length-(spec.parameters.keepSource?0:selected.length)+generated>1000)return bad(snapshot,[err('LIMIT_EXCEEDED','Dataset vượt 1000 cột')]);
  const remove=new Set(spec.parameters.keepSource?[]:selected);
  const columns=[...snapshot.columns.filter(c=>!remove.has(c.columnId)),...planned.flatMap(p=>p.columns)].sort((a,b)=>a.position-b.position);
  const rows=snapshot.rows.map(row=>{
    const cells={...row.cells};
    for(const p of planned){
      const current=row.cells[p.source];if(!current){errors.push(err('CELL_NOT_FOUND','Ô không tồn tại',p.source,row.rowId));continue;}
      const values=[...p.categories,...(p.includeMissing?[{kind:'null',value:null} as Cell]:[])];
      values.forEach((cat,i)=>{
        const isHit=missingKind(cat)!==undefined?missingKind(current)!==undefined:sameCell(current,cat);
        // Without a missing category, missing source rows must remain missing in all generated columns.
        cells[p.columns[i].columnId] = missingKind(current) !== undefined && !p.includeMissing
          ? { kind: 'null', value: null }
          : numeric(isHit ? 1 : 0);
      });
      if(remove.has(p.source))delete cells[p.source];
    }
    return {...row,cells};
  });
  if(errors.length)return bad(snapshot,errors);
  return done(snapshot,{columns,rows},[],[],true);
}
