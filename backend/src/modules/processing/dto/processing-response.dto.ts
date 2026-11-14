import type { DiagnosticsDto,DatasetDto,ColumnDto,ProcessingSummaryDto,SchemaChangesDto } from '../../../common/dto/response.dto';
import type { CellOutputDto } from '../../../common/dto/cell.dto';
import type { ProcessingSpecificationDto } from './processing.dto';
export interface ProcessOperationDto {_id:string;kind:'process';baseVersionId:string;resultVersionId:string;summary:ProcessingSummaryDto;createdAt:string}
// The discriminant kind is on the operation, not added to the serialized specification.
export type OperationDto = { _id:string;actorId:string;resultVersionId:string;summary:ProcessingSummaryDto;createdAt:string } & (
 | {kind:'process';baseVersionId:string;specification:ProcessingSpecificationDto & {engineVersion:string}}
 | {kind:'import';baseVersionId:null;specification:{importOptions:import('../../datasets/dto/import-options.dto').ImportOptionsDto;fileSha256:string}}
 | {kind:'restore';baseVersionId:string;specification:{targetVersionId:string}}
);
export interface CreatePreviewResponseDto {previewId:string;status:'ready'|'invalid';canApply:boolean;baseVersionId:string;candidateVersionId:string|null;engineVersion:string;specHash:string;summary:ProcessingSummaryDto;schemaChanges:SchemaChangesDto;diagnostics:DiagnosticsDto;expiresAt:string}
export interface PreviewChangeDto {rowId:string;ordinal:number;changeKind:'updated'|'deleted'|'inserted';beforePosition:number|null;afterPosition:number|null;beforeCells:Record<string,CellOutputDto>|null;afterCells:Record<string,CellOutputDto>|null;diffColumnIds:string[]}
export interface PreviewResponseDto {preview:Omit<CreatePreviewResponseDto,'status'> & {status:'ready'|'invalid'|'applied'};changes:PreviewChangeDto[];page:number;limit:number;totalChanges:number;totalPages:number}
export interface ApplyPreviewResponseDto {operation:ProcessOperationDto;dataset:Pick<DatasetDto,'currentVersionId'|'revision'>}
export interface ImportDatasetResponseDto {dataset:Pick<DatasetDto,'_id'|'currentVersionId'|'revision'|'originalFile'>;version:{_id:string;versionNumber:number;rowCount:number;columnCount:number};columns:ColumnDto[];operationId:string}
