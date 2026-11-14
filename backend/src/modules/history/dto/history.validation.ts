import { InputValidator } from '../../../common/validation/validation';
import { queryObject,queryPage,queryEnum } from '../../../common/validation/query.validation';
import type { HistoryQueryDto,RestoreVersionDto } from './history.dto';
export function parseHistoryQuery(input:unknown):HistoryQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['page','limit','kind']);
 return v.finish({...queryPage(v,o,20),...(o.kind===undefined?{}:{kind:queryEnum(v,o.kind,'kind',['import','process','restore'])})} as HistoryQueryDto);
}
export function parseRestoreVersion(input:unknown):RestoreVersionDto {
 const v=new InputValidator();const o=v.object(input,'',['expectedCurrentVersionId']);v.id(o.expectedCurrentVersionId,'expectedCurrentVersionId','objectId');return v.finish(o as unknown as RestoreVersionDto);
}
