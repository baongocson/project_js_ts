import type { DatasetDto,PageDto } from '../../../common/dto/response.dto';
import type { WorkspaceStateDto } from './workspace.dto';
export interface ProjectDto {_id:string;name:string;lifecycle:'empty'|'ready';createdAt:string;updatedAt:string}
export interface WorkspaceDto extends WorkspaceStateDto {_id:string;revision:number;boundVersionId:string|null;updatedAt:string}
export interface WorkspaceAdjustmentDto {code:'COLUMN_REMOVED'|'COLUMN_TYPE_CHANGED'|'ROW_REMOVED'|'PAGE_CLAMPED';path:string;reason:string}
export interface CreateProjectResponseDto {project:ProjectDto;workspace:{_id:string;revision:number;activeTab:WorkspaceStateDto['activeTab']}}
export type ListProjectsResponseDto = PageDto<Pick<ProjectDto,'_id'|'name'|'lifecycle'|'updatedAt'>>;
export interface ProjectDetailResponseDto {project:ProjectDto;workspace:WorkspaceDto;dataset:DatasetDto|null;workspaceAdjusted:boolean;adjustments:WorkspaceAdjustmentDto[]}
export interface PatchWorkspaceResponseDto {workspace:WorkspaceDto;workspaceAdjusted:boolean;adjustments:WorkspaceAdjustmentDto[]}
export type RenameProjectResponseDto = Pick<ProjectDto,'_id'|'name'|'updatedAt'>;
