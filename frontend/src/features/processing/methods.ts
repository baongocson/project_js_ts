import type { ProcessingMethod,ProcessingSpecification,Scope,Cell } from '@dashboard/data-core';
import type { ProcessingGroup } from '../../shared/ui';
export const methodGroups: Record<ProcessingGroup, ProcessingMethod[]> = {
  cleaning: ['normalize_whitespace', 'remove_duplicates', 'strip_html', 'uppercase', 'lowercase', 'replace_value', 'convert_number', 'convert_text', 'convert_date', 'convert_datetime', 'convert_boolean'],
  missing: ['fill_constant', 'fill_mean', 'fill_median', 'fill_mode', 'fill_max', 'drop_missing_rows', 'drop_missing_columns'],
  outliers: ['clip_iqr', 'clip_zscore'],
  scaling: ['scale_minmax', 'standardize'],
  transformation: ['log1p', 'square', 'tfidf'],
  encoding: ['one_hot', 'ordinal'],
};
export const presets:Record<ProcessingMethod,Record<string,unknown>>={
  tfidf:{lowercase:true,minDf:1,maxFeatures:100,norm:'l2',sublinearTf:false,keepSource:true},
  edit_cell:{value:{kind:'text',value:''}},remove_duplicates:{keep:'first'},strip_html:{decodeEntities:true},normalize_whitespace:{mode:'trim'},uppercase:{},lowercase:{},replace_value:{from:{kind:'text',value:''},to:{kind:'text',value:''},match:'exact'},convert_number:{decimalSeparator:'.',allowThousands:false},convert_text:{format:'canonical'},convert_date:{inputFormat:'YYYY-MM-DD'},convert_datetime:{inputFormat:'ISO8601',timezone:'UTC'},convert_boolean:{trueValues:['true','1'],falseValues:['false','0'],caseSensitive:false},fill_mean:{},fill_median:{},fill_mode:{tieBreak:'typed-ascending'},fill_max:{},fill_constant:{value:{kind:'number',value:0}},drop_missing_rows:{condition:'any'},drop_missing_columns:{condition:'any'},clip_iqr:{factor:1.5},clip_zscore:{threshold:3},scale_minmax:{rangeMin:0,rangeMax:1},standardize:{},log1p:{},square:{},one_hot:{keepSource:false,missingCategory:false,asCategory:false},ordinal:{mapping:[],keepSource:false},
};
export const labels:Record<ProcessingMethod,string>={tfidf:'TF-IDF · Vector hóa văn bản',edit_cell:'Sửa một ô',remove_duplicates:'Xóa dòng trùng',strip_html:'Bỏ HTML',normalize_whitespace:'Chuẩn hóa khoảng trắng',uppercase:'Viết hoa',lowercase:'Viết thường',replace_value:'Thay giá trị',convert_number:'Chuyển sang số',convert_text:'Chuyển sang text',convert_date:'Chuyển sang ngày',convert_datetime:'Chuyển sang thời gian',convert_boolean:'Chuyển sang boolean',fill_mean:'Điền trung bình',fill_median:'Điền trung vị',fill_mode:'Điền mode',fill_max:'Điền lớn nhất',fill_constant:'Điền giá trị',drop_missing_rows:'Xóa dòng thiếu',drop_missing_columns:'Xóa cột thiếu',clip_iqr:'Giới hạn IQR',clip_zscore:'Giới hạn z-score',scale_minmax:'Scale min–max',standardize:'Chuẩn hóa chuẩn',log1p:'Log(1+x)',square:'Bình phương',one_hot:'Mã hóa one-hot',ordinal:'Mã hóa ordinal'};
export function allowedScopes(method:ProcessingMethod):Scope['type'][] {
  if(method==='tfidf')return ['columns'];
  if(method==='edit_cell')return ['cell'];if(method==='remove_duplicates')return ['dataset'];if(method==='ordinal')return ['columns'];
  if(method.startsWith('convert_')||['drop_missing_rows','drop_missing_columns','one_hot'].includes(method))return ['columns','dataset'];
  return ['cell','columns','dataset'];
}
function validCell(cell:unknown):cell is Cell{
  if(!cell||typeof cell!=='object'||!('kind'in cell)||!('value'in cell))return false;
  if(cell.kind==='null')return cell.value===null;
  if(cell.kind==='number')return typeof cell.value==='number'&&Number.isFinite(cell.value)&&(!Number.isInteger(cell.value)||Number.isSafeInteger(cell.value));
  if(cell.kind==='boolean')return typeof cell.value==='boolean';
  if(!['text','date','datetime'].includes(String(cell.kind))||typeof cell.value!=='string')return false;
  if(cell.kind==='date')return /^\d{4}-\d{2}-\d{2}$/.test(cell.value)&&Number.isFinite(Date.parse(cell.value))&&new Date(cell.value).toISOString().slice(0,10)===cell.value;
  if(cell.kind==='datetime')return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cell.value)&&Number.isFinite(Date.parse(cell.value))&&new Date(cell.value).toISOString()===cell.value;
  return !/[\uD800-\uDFFF]/u.test(cell.value);
}
export function makeSpecification(method:ProcessingMethod,parameters:Record<string,unknown>,scope:Scope):ProcessingSpecification{
  if(method==='tfidf'&&(scope.type!=='columns'||scope.columnIds.length!==1))throw new Error('TF-IDF cần đúng một cột text');
  if(!Object.hasOwn(presets,method)||!allowedScopes(method).includes(scope.type))throw new Error('Scope không hợp lệ cho phương pháp');
  if(scope.type==='cell'&&(!scope.rowId||!scope.columnId))throw new Error('Chọn một ô trong bảng trước');
  if(scope.type==='columns'&&(!scope.columnIds.length||new Set(scope.columnIds).size!==scope.columnIds.length||method==='ordinal'&&scope.columnIds.length!==1))throw new Error('Chọn cột hợp lệ; ordinal chỉ nhận một cột');
  for(const [key,value]of Object.entries(parameters)){
    if(!Object.hasOwn(presets[method],key))throw new Error(`Tham số không hỗ trợ: ${key}`);
    if(['value','from','to'].includes(key)&&!validCell(value))throw new Error(`Giá trị typed không hợp lệ: ${key}`);
    if(['factor','threshold','rangeMin','rangeMax'].includes(key)&&(typeof value!=='number'||!Number.isFinite(value)||['factor','threshold'].includes(key)&&value<=0))throw new Error(`Tham số số không hợp lệ: ${key}`);
    if(typeof presets[method][key]==='boolean'&&typeof value!=='boolean')throw new Error(`Cần giá trị boolean: ${key}`);
  }
  const params={...structuredClone(presets[method]),...parameters};
  if(method==='tfidf'&&(!Number.isSafeInteger(params.minDf)||Number(params.minDf)<1||!Number.isSafeInteger(params.maxFeatures)||Number(params.maxFeatures)<1||Number(params.maxFeatures)>1000||!['l2','none'].includes(String(params.norm))))throw new Error('Tham số TF-IDF không hợp lệ');
  const enums:Record<string,readonly unknown[]>={keep:['first'],mode:['trim','collapse','remove'],match:['exact'],decimalSeparator:['.',','],format:['canonical'],inputFormat:method==='convert_date'?['YYYY-MM-DD']:['ISO8601'],tieBreak:['typed-ascending'],condition:['any','all']};
  for(const [key,values]of Object.entries(enums))if(key in params&&!values.includes(params[key]))throw new Error(`Giá trị không hỗ trợ: ${key}`);
  if(method==='convert_boolean'){
    for(const key of ['trueValues','falseValues'])if(!Array.isArray(params[key])||!(params[key] as unknown[]).length||(params[key] as unknown[]).some(value=>typeof value!=='string'||!value.length))throw new Error('Mỗi danh sách boolean cần ít nhất một chuỗi không rỗng');
    const canonical=(value:string)=>params.caseSensitive?value:value.toLowerCase();
    const truth=(params.trueValues as string[]).map(canonical),falsehood=(params.falseValues as string[]).map(canonical);
    if(new Set(truth).size!==truth.length||new Set(falsehood).size!==falsehood.length||truth.some(value=>falsehood.includes(value)))throw new Error('Các giá trị boolean không được trùng hoặc chồng lấn');
  }
  if(method==='scale_minmax'&&Number(params.rangeMin)>=Number(params.rangeMax))throw new Error('rangeMin phải nhỏ hơn rangeMax');
  if(method==='convert_datetime')try{new Intl.DateTimeFormat('en',{timeZone:String(params.timezone)});}catch{throw new Error('Múi giờ IANA không hợp lệ');}
  if(method==='ordinal'){
    const mapping=params.mapping as {value:Cell;label:number}[];if(!Array.isArray(mapping)||mapping.length>5000||mapping.some(item=>!item||!validCell(item.value)||!Number.isFinite(item.label)||Number.isInteger(item.label)&&!Number.isSafeInteger(item.label)))throw new Error('Mapping ordinal không hợp lệ hoặc vượt 5000 category');
    if(new Set(mapping.map(item=>JSON.stringify([item.value.kind,item.value.value]))).size!==mapping.length||new Set(mapping.map(item=>item.label)).size!==mapping.length)throw new Error('Category/label ordinal không được trùng');
  }
  return {method,parameters:params,scope,statisticsScope:{type:'whole-columns'}} as ProcessingSpecification;
}
