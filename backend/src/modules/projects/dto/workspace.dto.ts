import type { CellInputDto } from '../../../common/dto/cell.dto';
export type RowFilterDto = {columnId:string;op:'isMissing'|'isNotMissing'} | {columnId:string;op:'eq'|'ne'|'lt'|'lte'|'gt'|'gte'|'contains';value:CellInputDto};
export interface ChartConfigDto {xColumnId:string|null;yColumnId:string|null;zColumnId:string|null;colorMode:'normal'|'missing'|'outlier';outlierColumnIds:string[];outlierMethod:'iqr'|'zscore';threshold:number}
export interface SelectionDto {columnIds:string[];cell:{rowId:string;columnId:string}|null}
export interface TableStateDto {filters:RowFilterDto[];sort:{columnId:string;direction:'asc'|'desc'}|null;page:number;pageSize:number}
export interface WorkspaceStateDto {activeTab:'collection'|'cleaning'|'missing'|'outliers'|'scaling'|'transformation'|'encoding'|'history';chartConfig:ChartConfigDto;selection:SelectionDto;tableState:TableStateDto}
export interface PatchWorkspaceDto {revision:number;boundVersionId:string|null;activeTab?:WorkspaceStateDto['activeTab'];chartConfig?:Partial<ChartConfigDto>;selection?:Partial<SelectionDto>;tableState?:Partial<TableStateDto>}
