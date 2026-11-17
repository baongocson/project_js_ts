import type { WorkspaceState as WorkspaceStateDto,ChartConfig as ChartConfigDto,Selection as SelectionDto,TableState as TableStateDto } from '@dashboard/data-core';
export type { RowFilter as RowFilterDto,ChartConfig as ChartConfigDto,Selection as SelectionDto,TableState as TableStateDto,WorkspaceState as WorkspaceStateDto } from '@dashboard/data-core';
export interface PatchWorkspaceDto {revision:number;boundVersionId:string|null;activeTab?:WorkspaceStateDto['activeTab'];chartConfig?:Partial<ChartConfigDto>;selection?:Partial<SelectionDto>;tableState?:Partial<TableStateDto>}
