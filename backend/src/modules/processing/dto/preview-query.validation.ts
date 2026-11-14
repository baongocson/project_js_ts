import { InputValidator } from '../../../common/validation/validation';
import { queryObject,queryPage } from '../../../common/validation/query.validation';
export interface PreviewQueryDto {page:number;limit:number}
export function parsePreviewQuery(input:unknown):PreviewQueryDto {const v=new InputValidator();const o=queryObject(v,input,['page','limit']);return v.finish(queryPage(v,o,5));}
