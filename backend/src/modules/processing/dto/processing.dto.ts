import type { CellInputDto } from '../../../common/dto/cell.dto';
import type { DiagnosticsDto } from '../../../common/dto/response.dto';
export type ProcessingScopeDto = {type:'cell';rowId:string;columnId:string} | {type:'columns';columnIds:string[]} | {type:'dataset'};
export interface ProcessingParametersByMethod {
 edit_cell:{value:CellInputDto};remove_duplicates:{keep:'first'};strip_html:{decodeEntities:boolean};normalize_whitespace:{mode:'trim'|'collapse'|'remove'};
 convert_number:{decimalSeparator:'.'|',';allowThousands:boolean};convert_text:{format:'canonical'};convert_date:{inputFormat:'YYYY-MM-DD'};
 convert_datetime:{inputFormat:'ISO8601';timezone:string};convert_boolean:{trueValues:string[];falseValues:string[];caseSensitive:boolean};
 uppercase:Record<string,never>;lowercase:Record<string,never>;replace_value:{from:CellInputDto;to:CellInputDto;match:'exact'};
 fill_mean:Record<string,never>;fill_median:Record<string,never>;fill_mode:{tieBreak:'typed-ascending'};fill_max:Record<string,never>;fill_constant:{value:CellInputDto};
 drop_missing_rows:{condition:'any'|'all'};drop_missing_columns:{condition:'any'|'all'};clip_iqr:{factor:number};clip_zscore:{threshold:number};
 scale_minmax:{rangeMin:number;rangeMax:number};standardize:Record<string,never>;log1p:Record<string,never>;square:Record<string,never>;
 one_hot:{keepSource:boolean;missingCategory:boolean;asCategory:boolean};ordinal:{mapping:{value:CellInputDto;label:number}[];keepSource:boolean};
}
export type ProcessingMethodDto = keyof ProcessingParametersByMethod;
export type ProcessingSpecificationDto = {[M in ProcessingMethodDto]:{method:M;parameters:ProcessingParametersByMethod[M];scope:ProcessingScopeDto;statisticsScope:{type:'whole-columns'}}}[ProcessingMethodDto];
export interface CreatePreviewDto {baseVersionId:string;specification:ProcessingSpecificationDto}
export interface ApplyPreviewDto {previewId:string}
export interface PreviewOutcomeDto {status:'ready'|'invalid';canApply:boolean;diagnostics:DiagnosticsDto}
export type ProcessingParametersDto = ProcessingParametersByMethod[ProcessingMethodDto];
