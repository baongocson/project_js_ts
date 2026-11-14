import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DiagnosticDto } from '../../common/dto/cell.dto';
import type { DiagnosticsDto } from '../../common/dto/response.dto';
import type { PreviewOutcomeDto } from './dto/processing.dto';
export function buildDiagnostics(errors:DiagnosticDto[],warnings:DiagnosticDto[]):DiagnosticsDto {
 const errorSamples=errors.slice(0,100);const warningSamples=warnings.slice(0,100-errorSamples.length);
 return {errorCount:errors.length,warningCount:warnings.length,errors:errorSamples,warnings:warningSamples,truncated:errorSamples.length<errors.length||warningSamples.length<warnings.length};
}
export function previewOutcome(hasChanges:boolean,errors:DiagnosticDto[]=[],warnings:DiagnosticDto[]=[]):PreviewOutcomeDto {
 const visibleWarnings=!errors.length&&!hasChanges?[{code:'NO_CHANGES_DETECTED',message:'Không có thay đổi'},...warnings]:warnings;
 return {status:errors.length?'invalid':'ready',canApply:!errors.length&&hasChanges,diagnostics:buildDiagnostics(errors,visibleWarnings)};
}
// Caller checks current owner/lifecycle, receipt and expiry before invoking this policy.
export function assertPreviewApplicable(outcome:PreviewOutcomeDto):void {
 if(outcome.status==='invalid')throw new BadRequestException({code:'PREVIEW_INVALID',message:'Preview có lỗi dữ liệu'});
 if(!outcome.canApply)throw new ConflictException({code:'NO_CHANGES_TO_APPLY',message:'Không có thay đổi để áp dụng'});
}
export const STATISTICS_ERROR_CODES={zeroIqr:'ZERO_SPREAD',zeroStd:'ZERO_VARIANCE',allMissing:'ALL_MISSING_COLUMN'} as const;
