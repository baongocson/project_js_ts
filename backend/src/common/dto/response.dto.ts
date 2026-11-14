import type { CellInputDto,CellOutputDto,DiagnosticDto,LogicalType,ValidationIssueDto } from './cell.dto';
export interface ApiErrorDto {error:{code:string;message:string;details:{issues?:ValidationIssueDto[];[key:string]:unknown};requestId:string}}
export interface PageDto<T> {items:T[];page:number;limit:number;total:number}
export interface DiagnosticsDto {errorCount:number;warningCount:number;errors:DiagnosticDto[];warnings:DiagnosticDto[];truncated:boolean}
export interface OriginalFileDto {name:string;byteSize:number;sha256:string;importedAt:string}
export interface ColumnFormatDto {inputFormat?:string;timezone?:string;decimalSeparator?:'.'|',';allowThousands?:boolean}
export interface ColumnLineageDto {sourceColumnId:string;category?:CellInputDto|{isMissing:true}}
export interface ColumnDto {columnId:string;name:string;position:number;logicalType:LogicalType;format:ColumnFormatDto|null;lineage:ColumnLineageDto|null}
export interface DatasetDto {_id:string;currentVersionId:string;revision:number;originalFile:OriginalFileDto}
export interface VersionDto {_id:string;versionNumber:number;state:'published';rowCount:number;columnCount:number;encodedByteSize:number}
export interface RowDto {rowId:string;position:number;cells:Record<string,CellOutputDto>}
export interface VersionResponseDto {version:VersionDto;columns:ColumnDto[]}
export interface RowsResponseDto {rows:RowDto[];page:number;limit:number;totalRows:number;filteredRows:number;totalPages:number}
export interface RowResponseDto {versionId:string;row:RowDto}
export interface SchemaChangesDto {added:ColumnDto[];removed:ColumnDto[];modified:{columnId:string;before:ColumnDto;after:ColumnDto}[]}
export interface ProcessingSummaryDto {
 before:{rowCount:number;columnCount:number};after:{rowCount:number;columnCount:number};
 insertedRowCount:number;deletedRowCount:number;updatedRowCount:number;updatedCellCount:number;
 addedColumnCount:number;removedColumnCount:number;typeChangedColumnCount:number;metadataChangedColumnCount:number;
 usedStatistics:{columnId:string;validCount:number;missingCount:number;mean?:number;median?:number;mode?:CellInputDto;min?:number;max?:number;std?:number;q1?:number;q3?:number;lower?:number;upper?:number}[];
}
