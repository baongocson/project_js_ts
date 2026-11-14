import type { OperationDto } from '../../processing/dto/processing-response.dto';
import type { ProcessingSummaryDto,PageDto } from '../../../common/dto/response.dto';
export type HistoryResponseDto = PageDto<OperationDto>;
export interface RestoreVersionResponseDto {operation:{_id:string;kind:'restore';baseVersionId:string;resultVersionId:string;createdAt:string};newVersion:{_id:string;versionNumber:number;parentVersionId:string;restoredFromVersionId:string}}
