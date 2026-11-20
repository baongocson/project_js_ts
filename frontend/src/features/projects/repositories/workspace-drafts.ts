import type { Workspace } from '../types';
export type WorkspacePatch=Partial<Pick<Workspace,'tableState'|'selection'|'chartConfig'|'activeTab'>>;
export interface WorkspaceDraft {schema:1;id:string;userId:string;projectId:string;revision:number;boundVersionId:string|null;patch:WorkspacePatch;updatedAt:string}
const prefix='dashboard-workspace-draft-v1:';
function key(userId:string,projectId:string,id:string){return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}:${id}`;}
function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value)??'undefined';
}
export function draftMatches(workspace:Workspace,draft:WorkspaceDraft){return workspace.boundVersionId===draft.boundVersionId&&Object.entries(draft.patch).every(([key,value])=>canonical(workspace[key as keyof Workspace])===canonical(value));}
function valid(value:unknown):value is WorkspaceDraft{
  if(!value||typeof value!=='object')return false;
  const draft=value as WorkspaceDraft;
  if(!(draft.schema===1&&typeof draft.id==='string'&&typeof draft.userId==='string'&&typeof draft.projectId==='string'&&Number.isSafeInteger(draft.revision)&&draft.revision>=0&&(draft.boundVersionId===null||typeof draft.boundVersionId==='string')&&!!draft.patch&&typeof draft.patch==='object'&&!Array.isArray(draft.patch)&&Object.keys(draft.patch).every(key=>['tableState','selection','chartConfig','activeTab'].includes(key))&&typeof draft.updatedAt==='string'))return false;
  const {tableState,selection,chartConfig,activeTab}=draft.patch;
  if('tableState'in draft.patch&&(!tableState||!Number.isSafeInteger(tableState.page)||tableState.page<1||!Number.isSafeInteger(tableState.pageSize)||tableState.pageSize<1||tableState.pageSize>100||!Array.isArray(tableState.filters)||tableState.filters.some(filter=>!filter||typeof filter.columnId!=='string'||!['isMissing','isNotMissing','eq','ne','lt','lte','gt','gte','contains'].includes(filter.op))||tableState.sort!==null&&(!tableState.sort||typeof tableState.sort.columnId!=='string'||!['asc','desc'].includes(tableState.sort.direction))))return false;
  if('selection'in draft.patch&&(!selection||!Array.isArray(selection.columnIds)||selection.columnIds.some(id=>typeof id!=='string')||selection.cell!==null&&(!selection.cell||typeof selection.cell.rowId!=='string'||typeof selection.cell.columnId!=='string')))return false;
  if('chartConfig'in draft.patch&&(!chartConfig||[chartConfig.xColumnId,chartConfig.yColumnId,chartConfig.zColumnId].some(id=>id!==null&&typeof id!=='string')||!Array.isArray(chartConfig.outlierColumnIds)||chartConfig.outlierColumnIds.some(id=>typeof id!=='string')||!['normal','missing','outlier'].includes(chartConfig.colorMode)||!['iqr','zscore'].includes(chartConfig.outlierMethod)||!Number.isFinite(chartConfig.threshold)||chartConfig.threshold<=0))return false;
  if('activeTab'in draft.patch&&!['collection','cleaning','missing','outliers','scaling','transformation','encoding','history'].includes(activeTab??''))return false;
  return true;
}
export const workspaceDrafts={
  save(draft:WorkspaceDraft){if(!valid(draft))throw new Error('Bản nháp workspace không hợp lệ');localStorage.setItem(key(draft.userId,draft.projectId,draft.id),JSON.stringify(draft));},
  list(userId:string,projectId:string):WorkspaceDraft[]{
    const scope=key(userId,projectId,'');const result:WorkspaceDraft[]=[];
    for(let index=0;index<localStorage.length;index++){
      const name=localStorage.key(index);if(!name?.startsWith(scope))continue;
      const content=localStorage.getItem(name);let value:unknown;try{value=JSON.parse(content??'null');}catch{throw new Error('Có bản nháp hỏng; dữ liệu gốc vẫn được giữ trong bộ nhớ trình duyệt');}
      if(!valid(value)||value.userId!==userId||value.projectId!==projectId)throw new Error('Không đọc được bản nháp workspace; chưa xóa dữ liệu lưu trước');
      result.push(value);
    }
    return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  },
  remove(userId:string,projectId:string,id:string){localStorage.removeItem(key(userId,projectId,id));},
  listAccount(userId:string):WorkspaceDraft[]{
    const scope=`${prefix}${encodeURIComponent(userId)}:`,result:WorkspaceDraft[]=[];
    for(let index=0;index<localStorage.length;index++){
      const name=localStorage.key(index);if(!name?.startsWith(scope))continue;
      const value:unknown=JSON.parse(localStorage.getItem(name)??'null');if(!valid(value)||value.userId!==userId)throw new Error('Không đọc được bản nháp của tài khoản; dữ liệu được giữ nguyên');result.push(value);
    }
    return result;
  },
};
