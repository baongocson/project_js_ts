import { parseFilters } from '../../../common/validation/query.validation';
import { BadRequestException } from '@nestjs/common';
import { InputValidator } from '../../../common/validation/validation';
import type { PatchWorkspaceDto } from './workspace.dto';
export function parsePatchWorkspace(input:unknown):PatchWorkspaceDto {
 const v=new InputValidator(); const body=v.object(input,'',['revision','boundVersionId','activeTab','chartConfig','selection','tableState']);
 v.integer(body.revision,'revision',1);if(body.boundVersionId!==null)v.id(body.boundVersionId,'boundVersionId','objectId');
 let fields=0;
 if(Object.hasOwn(body,'activeTab')){fields++;v.enumeration(body.activeTab,'activeTab',['collection','cleaning','missing','outliers','scaling','transformation','encoding','history']);}
 if(Object.hasOwn(body,'chartConfig')){
  const c=v.object(body.chartConfig,'chartConfig',['xColumnId','yColumnId','zColumnId','colorMode','outlierColumnIds','outlierMethod','threshold']);fields+=Object.keys(c).length;
  for(const key of ['xColumnId','yColumnId','zColumnId'])if(Object.hasOwn(c,key)&&c[key]!==null)v.id(c[key],'chartConfig.'+key);
  if(Object.hasOwn(c,'colorMode'))v.enumeration(c.colorMode,'chartConfig.colorMode',['normal','missing','outlier']);
  if(Object.hasOwn(c,'outlierMethod'))v.enumeration(c.outlierMethod,'chartConfig.outlierMethod',['iqr','zscore']);
  if(Object.hasOwn(c,'outlierColumnIds'))v.ids(c.outlierColumnIds,'chartConfig.outlierColumnIds',0);
  if(Object.hasOwn(c,'threshold'))v.number(c.threshold,'chartConfig.threshold',true);
 }
 if(Object.hasOwn(body,'selection')){
  const s=v.object(body.selection,'selection',['columnIds','cell']);fields+=Object.keys(s).length;
  if(Object.hasOwn(s,'columnIds'))v.ids(s.columnIds,'selection.columnIds',0);
  if(Object.hasOwn(s,'cell')&&s.cell!==null){const cell=v.object(s.cell,'selection.cell',['rowId','columnId']);v.id(cell.rowId,'selection.cell.rowId');v.id(cell.columnId,'selection.cell.columnId');}
 }
 if(Object.hasOwn(body,'tableState')){
  const t=v.object(body.tableState,'tableState',['filters','sort','page','pageSize']);fields+=Object.keys(t).length;
  if(Object.hasOwn(t,'page'))v.integer(t.page,'tableState.page',1);
  if(Object.hasOwn(t,'pageSize'))v.integer(t.pageSize,'tableState.pageSize',1,100);
  if(Object.hasOwn(t,'sort')&&t.sort!==null){const sort=v.object(t.sort,'tableState.sort',['columnId','direction']);v.id(sort.columnId,'tableState.sort.columnId');v.enumeration(sort.direction,'tableState.sort.direction',['asc','desc']);}
  if(Object.hasOwn(t,'filters')) t.filters=parseFilters(v,t.filters,'tableState.filters');
 }
 const result=v.finish(body as unknown as PatchWorkspaceDto);
 if(!fields)throw new BadRequestException({code:'EMPTY_PATCH',message:'Không có trường cấu hình để cập nhật'});
 return result;
}
