import { PayloadTooLargeException } from '@nestjs/common';
import { InputValidator } from '../../../common/validation/validation';
import type { ApplyPreviewDto, CreatePreviewDto } from './processing.dto';
const rules: Record<string,{scopes:string[];defaults:Record<string,unknown>}> = {
 tfidf:{scopes:['columns'],defaults:{lowercase:true,minDf:1,maxFeatures:100,norm:'l2',sublinearTf:false,keepSource:true}},
 edit_cell:{scopes:['cell'],defaults:{value:undefined}},
 remove_duplicates:{scopes:['dataset'],defaults:{keep:'first'}},
 strip_html:{scopes:['cell','columns','dataset'],defaults:{decodeEntities:true}},
 normalize_whitespace:{scopes:['cell','columns','dataset'],defaults:{mode:'trim'}},
 convert_number:{scopes:['columns','dataset'],defaults:{decimalSeparator:'.',allowThousands:false}},
 convert_text:{scopes:['columns','dataset'],defaults:{format:'canonical'}},
 convert_date:{scopes:['columns','dataset'],defaults:{inputFormat:'YYYY-MM-DD'}},
 convert_datetime:{scopes:['columns','dataset'],defaults:{inputFormat:'ISO8601',timezone:'UTC'}},
 convert_boolean:{scopes:['columns','dataset'],defaults:{trueValues:['true','1'],falseValues:['false','0'],caseSensitive:false}},
 uppercase:{scopes:['cell','columns','dataset'],defaults:{}},lowercase:{scopes:['cell','columns','dataset'],defaults:{}},
 replace_value:{scopes:['cell','columns','dataset'],defaults:{from:undefined,to:undefined,match:'exact'}},
 fill_mean:{scopes:['cell','columns','dataset'],defaults:{}},fill_median:{scopes:['cell','columns','dataset'],defaults:{}},
 fill_mode:{scopes:['cell','columns','dataset'],defaults:{tieBreak:'typed-ascending'}},fill_max:{scopes:['cell','columns','dataset'],defaults:{}},
 fill_constant:{scopes:['cell','columns','dataset'],defaults:{value:undefined}},
 drop_missing_rows:{scopes:['columns','dataset'],defaults:{condition:'any'}},drop_missing_columns:{scopes:['columns','dataset'],defaults:{condition:'any'}},
 clip_iqr:{scopes:['cell','columns','dataset'],defaults:{factor:1.5}},clip_zscore:{scopes:['cell','columns','dataset'],defaults:{threshold:3}},
 scale_minmax:{scopes:['cell','columns','dataset'],defaults:{rangeMin:0,rangeMax:1}},standardize:{scopes:['cell','columns','dataset'],defaults:{}},
 log1p:{scopes:['cell','columns','dataset'],defaults:{}},square:{scopes:['cell','columns','dataset'],defaults:{}},
 one_hot:{scopes:['columns','dataset'],defaults:{keepSource:false,missingCategory:false,asCategory:false}},
 ordinal:{scopes:['columns'],defaults:{mapping:undefined,keepSource:false}},
};
export function parseCreatePreview(input:unknown):CreatePreviewDto {
 const v=new InputValidator(); const body=v.object(input,'',['baseVersionId','specification']);
 v.id(body.baseVersionId,'baseVersionId','objectId');
 const s=v.object(body.specification,'specification',['method','parameters','scope','statisticsScope']);
 const method=typeof s.method==='string'?s.method:'';const rule=Object.hasOwn(rules,method)?rules[method]:undefined;
 if(!rule)v.issue('specification.method','Phương pháp không được hỗ trợ');
 const scope=v.object(s.scope,'specification.scope',['type','rowId','columnId','columnIds']);
 v.enumeration(scope.type,'specification.scope.type',rule?.scopes??[]);
 const scopeKeys=scope.type==='cell'?['type','rowId','columnId']:scope.type==='columns'?['type','columnIds']:['type'];
 v.object(scope,'specification.scope',scopeKeys);
 if(scope.type==='cell'){v.id(scope.rowId,'specification.scope.rowId');v.id(scope.columnId,'specification.scope.columnId');}
 if(scope.type==='columns'){v.ids(scope.columnIds,'specification.scope.columnIds');if(method==='ordinal'&&Array.isArray(scope.columnIds)&&scope.columnIds.length!==1)v.issue('specification.scope.columnIds','Ordinal chỉ nhận một cột');}
 const stats=v.object(s.statisticsScope===undefined?{type:'whole-columns'}:s.statisticsScope,'specification.statisticsScope',['type']);
 v.enumeration(stats.type,'specification.statisticsScope.type',['whole-columns']);
 const supplied=v.object(s.parameters===undefined?{}:s.parameters,'specification.parameters',Object.keys(rule?.defaults??{}));
 const params={...(rule?.defaults??{}),...supplied};const path='specification.parameters.';
 if(method==='tfidf'&&(scope.type!=='columns'||!Array.isArray(scope.columnIds)||scope.columnIds.length!==1))v.issue('specification.scope','TF-IDF yêu cầu đúng một cột text');
 for(const [key,value]of Object.entries(params)) {
  if(['value','from','to'].includes(key))v.cell(value,path+key);
  else if(['decodeEntities','allowThousands','caseSensitive','keepSource','missingCategory','asCategory','lowercase','sublinearTf'].includes(key)){if(typeof value!=='boolean')v.issue(path+key,'Phải là boolean');}
  else if(key==='minDf')v.integer(value,path+key,1);
  else if(key==='maxFeatures')v.integer(value,path+key,1,1000);
  else if(key==='norm')v.enumeration(value,path+key,['l2','none']);
  else if(['factor','threshold'].includes(key))v.number(value,path+key,true);
  else if(['rangeMin','rangeMax'].includes(key))v.number(value,path+key);
  else if(key==='mode')v.enumeration(value,path+key,['trim','collapse','remove']);
  else if(key==='condition')v.enumeration(value,path+key,['any','all']);
  else if(key==='decimalSeparator')v.enumeration(value,path+key,['.',',']);
  else if(key==='keep')v.enumeration(value,path+key,['first']);
  else if(key==='format')v.enumeration(value,path+key,['canonical']);
  else if(key==='match')v.enumeration(value,path+key,['exact']);
  else if(key==='tieBreak')v.enumeration(value,path+key,['typed-ascending']);
  else if(key==='inputFormat')v.enumeration(value,path+key,method==='convert_date'?['YYYY-MM-DD']:['ISO8601']);
  else if(key==='timezone'){
    if(typeof value!=='string'||!value.length)v.issue(path+key,'Múi giờ không hợp lệ');
    else try {new Intl.DateTimeFormat('en',{timeZone:value}).format(0);} catch {v.issue(path+key,'Múi giờ IANA không hợp lệ');}
  }
  else if(['trueValues','falseValues'].includes(key)){if(!Array.isArray(value)||!value.length||!value.every(x=>typeof x==='string'))v.issue(path+key,'Phải là danh sách chuỗi không rỗng');}
 }
 if(method==='scale_minmax'&&typeof params.rangeMin==='number'&&typeof params.rangeMax==='number'&&params.rangeMin>=params.rangeMax)v.issue(path+'rangeMax','Phải lớn hơn rangeMin');
 if(method==='convert_boolean'&&Array.isArray(params.trueValues)&&Array.isArray(params.falseValues)){
   const normalize=(x:unknown)=>typeof x==='string'?(params.caseSensitive?x:x.toLowerCase()):x;
   const yes=params.trueValues.map(normalize), no=params.falseValues.map(normalize);
   if(new Set(yes).size!==yes.length||new Set(no).size!==no.length)v.issue(path+'trueValues','Mapping không được lặp sau khi so hoa/thường');
   if(yes.some(x=>no.includes(x)))v.issue(path+'trueValues','Hai tập mapping không được giao nhau');
 }
 if(method==='ordinal'){
  if(!Array.isArray(params.mapping))v.issue(path+'mapping','Thiếu mapping');
  else{
   if(params.mapping.length>5000)throw new PayloadTooLargeException({code:'LIMIT_EXCEEDED',message:'Mapping ordinal vượt 5000 phần tử'});
   v.integer(params.mapping.length,path+'mapping',0,5000);const keys=new Set<string>();const labels=new Set<unknown>();
   params.mapping.forEach((entry,i)=>{const p=path+'mapping.'+i;const item=v.object(entry,p,['value','label']);const cell=v.cell(item.value,p+'.value');if(cell.kind==='null'||(cell.kind==='text'&&(cell.value.trim()===''||cell.value.trim()==='N/A')))v.issue(p+'.value','Mapping ordinal chỉ chứa category không missing');v.number(item.label,p+'.label');const key=JSON.stringify([cell.kind,cell.value]);if(keys.has(key))v.issue(p+'.value','Category không được trùng');if(labels.has(item.label))v.issue(p+'.label','Label không được trùng');keys.add(key);labels.add(item.label);});
  }
 }
 return v.finish({baseVersionId:body.baseVersionId,specification:{method,parameters:params,scope,statisticsScope:stats}} as CreatePreviewDto);
}
export function parseApplyPreview(input:unknown):ApplyPreviewDto {
 const v=new InputValidator();const obj=v.object(input,'',['previewId']);v.id(obj.previewId,'previewId','objectId');return v.finish(obj as unknown as ApplyPreviewDto);
}
