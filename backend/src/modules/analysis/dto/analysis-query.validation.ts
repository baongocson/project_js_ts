import { InputValidator } from '../../../common/validation/validation';
import { queryObject,queryPage,queryInteger,queryNumber,queryEnum,queryColumnIds } from '../../../common/validation/query.validation';
import type { SummaryQueryDto,DistributionQueryDto,CorrelationQueryDto,Points3dQueryDto,ValueCountsQueryDto } from './analysis-query.dto';
function outliers(v:InputValidator,obj:Record<string,unknown>,key='threshold') {
 const outlierMethod=queryEnum(v,obj.outlierMethod,'outlierMethod',['iqr','zscore'],'iqr') as 'iqr'|'zscore';
 return {outlierMethod,[key]:queryNumber(v,obj[key],key,outlierMethod==='zscore'?3:1.5)};
}
export function parseSummaryQuery(input:unknown):SummaryQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['outlierMethod','outlierThreshold','outlierColumnIds']);const ids=queryColumnIds(v,o.outlierColumnIds,'outlierColumnIds');
 return v.finish({...outliers(v,o,'outlierThreshold'),...(ids===undefined?{}:{outlierColumnIds:ids})} as SummaryQueryDto);
}
export function parseDistributionQuery(input:unknown):DistributionQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['bins','outlierMethod','threshold']);
 return v.finish({...outliers(v,o),bins:queryInteger(v,o.bins,'bins',20)} as DistributionQueryDto);
}
export function parseCorrelationQuery(input:unknown):CorrelationQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['method']);return v.finish({method:queryEnum(v,o.method,'method',['pearson'],'pearson')} as CorrelationQueryDto);
}
export function parsePoints3dQuery(input:unknown):Points3dQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['xColumnId','yColumnId','zColumnId','colorMode','outlierColumnIds','outlierMethod','threshold','maxPoints']);
 for(const key of ['xColumnId','yColumnId','zColumnId'])v.id(o[key],key);
 const ids=queryColumnIds(v,o.outlierColumnIds,'outlierColumnIds');
 return v.finish({xColumnId:o.xColumnId,yColumnId:o.yColumnId,zColumnId:o.zColumnId,
  colorMode:queryEnum(v,o.colorMode,'colorMode',['normal','missing','outlier'],'normal'),...outliers(v,o),
  ...(ids===undefined?{}:{outlierColumnIds:ids}),maxPoints:queryInteger(v,o.maxPoints,'maxPoints',10000,10000)} as Points3dQueryDto);
}
export function parseValueCountsQuery(input:unknown):ValueCountsQueryDto {
 const v=new InputValidator();const o=queryObject(v,input,['page','limit','sort','includeMissing']);
 const bool=queryEnum(v,o.includeMissing,'includeMissing',['true','false'],'true');
 return v.finish({...queryPage(v,o,50),sort:queryEnum(v,o.sort,'sort',['-count','value'],'-count'),includeMissing:bool==='true'} as ValueCountsQueryDto);
}
