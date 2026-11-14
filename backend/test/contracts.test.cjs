const {test}=require('node:test');
const assert=require('node:assert/strict');
const {InputValidator}=require('../dist/common/validation/validation');
const {cellKey,outputCell,sameCell,acceptsCell}=require('../dist/common/domain/cell-policy');
const {canonicalRequest}=require('../dist/common/domain/canonical-request');
const {parseImportOptions}=require('../dist/modules/datasets/dto/import-options.dto');
const {parseCreatePreview,parseApplyPreview}=require('../dist/modules/processing/dto/processing.validation');
const {previewOutcome,assertPreviewApplicable,STATISTICS_ERROR_CODES}=require('../dist/modules/processing/preview-policy');
const {parsePatchWorkspace}=require('../dist/modules/projects/dto/workspace.validation');
const {planWorkspacePatch}=require('../dist/modules/projects/workspace-policy');
const col='00000000-0000-4000-8000-000000000001',row='00000000-0000-4000-8000-000000000002',id='0123456789abcdef01234567';
function cell(input){const v=new InputValidator();return v.finish(v.cell(input,'cell'));}
const request=(method,parameters={},scope={type:'cell',rowId:row,columnId:col})=>({baseVersionId:id,specification:{method,parameters,scope}});
const base=()=>({revision:4,boundVersionId:id,activeTab:'collection',chartConfig:{xColumnId:null,yColumnId:null,zColumnId:null,colorMode:'normal',outlierColumnIds:[],outlierMethod:'iqr',threshold:1.5},selection:{columnIds:[],cell:null},tableState:{filters:[],sort:null,page:1,pageSize:10}});
function code(error){return error.getResponse().code;}
test('missing tokens remain distinct, no Unicode/space/case normalization',()=>{
 const cells=[{kind:'null',value:null},...['',' ','N/A',' N/A '].map(value=>({kind:'text',value}))];
 assert.equal(new Set(cells.map(cellKey)).size,5);
 for(const input of cells){assert.deepEqual(cell(input),input);assert.notEqual(outputCell(input).missingKind,undefined);assert.equal(outputCell(input).value,input.value);assert.equal(acceptsCell('number',input),true);}
 assert.equal(sameCell({kind:'text',value:'é'},{kind:'text',value:'e\u0301'}),false);
 assert.equal(sameCell({kind:'text',value:'A'},{kind:'text',value:'a'}),false);
 assert.equal(sameCell({kind:'text',value:' a'},{kind:'text',value:'a'}),false);
 assert.equal(sameCell({kind:'number',value:1},{kind:'text',value:'1'}),false);
 assert.equal(acceptsCell('number',{kind:'text',value:'abc'}),false);
});
test('typed-null input rejects output-only metadata and unsafe or invalid values',()=>{
 for(const input of [{kind:'null'},{kind:'null',value:0},{kind:'null',value:null,missingKind:'null'},{kind:'number',value:Infinity},{kind:'number',value:9007199254740992},{kind:'date',value:'2026-02-30'},{kind:'datetime',value:'2026-02-30T00:00:00.000Z'}])assert.throws(()=>cell(input));
 assert.deepEqual(cell({kind:'date',value:'2024-02-29'}),{kind:'date',value:'2024-02-29'});
 assert.throws(()=>cell({kind:'text',value:String.fromCharCode(0xd800)}));
 assert.doesNotThrow(()=>cell({kind:'text',value:'😀'}));
});
test('import options accept explicit text type overrides without adding row caps',()=>{
 assert.equal(parseImportOptions(undefined).delimiter,',');
 assert.equal(parseImportOptions('{"delimiter":"tab"}').delimiter,'\t');
 const options=parseImportOptions({columnTypes:[{position:0,logicalType:'text'}]});assert.equal(options.columnTypes[0].logicalType,'text');
 assert.throws(()=>parseImportOptions(null));assert.throws(()=>parseImportOptions('{'));
 assert.throws(()=>parseImportOptions({columnTypes:[{position:0,logicalType:'text'},{position:0,logicalType:'number'}]}));
 assert.throws(()=>parseImportOptions({rowLimit:100000}));
});
test('preview validation defaults safely; no hidden pipeline or scope fields',()=>{
 const preview=parseCreatePreview(request('edit_cell',{value:{kind:'null',value:null}}));assert.equal(preview.specification.statisticsScope.type,'whole-columns');
 for(const change of [p=>p.specification.engineVersion='client',p=>p.specification.scope.filters=[],p=>p.specification.parameters.extra=true,p=>p.specification.parameters.value.missingKind='null']){const p=request('edit_cell',{value:{kind:'null',value:null}});change(p);assert.throws(()=>parseCreatePreview(p));}
 assert.throws(()=>parseCreatePreview(request('__proto__')));
 assert.throws(()=>parseCreatePreview(request('scale_minmax',{rangeMin:1,rangeMax:0})));
 assert.throws(()=>parseCreatePreview(request('ordinal',{mapping:[{value:{kind:'text',value:'a'},label:0},{value:{kind:'text',value:'a'},label:1}]},{type:'columns',columnIds:[col]})));
 assert.throws(()=>parseApplyPreview({previewId:id,parameters:{}}));
});
test('no-op is ready but Apply is blocked; IQR/std diagnostics stay different',()=>{
 const noop=previewOutcome(false);assert.equal(noop.status,'ready');assert.equal(noop.canApply,false);assert.equal(noop.diagnostics.warnings[0].code,'NO_CHANGES_DETECTED');
 assert.throws(()=>assertPreviewApplicable(noop),e=>e.getStatus()===409&&code(e)==='NO_CHANGES_TO_APPLY');
 assert.doesNotThrow(()=>assertPreviewApplicable(previewOutcome(true)));
 const invalid=previewOutcome(false,[{code:'DOMAIN_ERROR',message:'Giá trị không hợp lệ'}]);assert.equal(invalid.status,'invalid');assert.equal(invalid.canApply,false);
 assert.notEqual(STATISTICS_ERROR_CODES.zeroIqr,STATISTICS_ERROR_CODES.zeroStd);
});
test('autosave identical succeeds, stale identical conflicts, actual change increments once',()=>{
 const current=base();const same=parsePatchWorkspace({revision:4,boundVersionId:id,chartConfig:{colorMode:'normal'}});
 const result=planWorkspacePatch(current,same,id);assert.equal(result.changed,false);assert.equal(result.workspace,current);assert.equal(current.revision,4);
 assert.throws(()=>planWorkspacePatch(current,{...same,revision:3},id),e=>code(e)==='WORKSPACE_REVISION_CONFLICT');
 assert.throws(()=>planWorkspacePatch(current,same,'f'.repeat(24)),e=>code(e)==='BASE_VERSION_STALE');
 const changed=planWorkspacePatch(current,parsePatchWorkspace({revision:4,boundVersionId:id,selection:{cell:{rowId:row,columnId:col}}}),id);assert.equal(changed.changed,true);assert.equal(changed.workspace.revision,5);assert.deepEqual(changed.workspace.chartConfig,current.chartConfig);
 assert.equal(current.selection.cell,null);
});
test('nested null and empty patch restrictions do not reject valid clear operations',()=>{
 for(const input of [{revision:4,boundVersionId:id},{revision:4,boundVersionId:id,chartConfig:{}},{revision:4,boundVersionId:id,chartConfig:null},{revision:4,boundVersionId:id,selection:{columnIds:null}},{revision:4,boundVersionId:id,tableState:{sort:{direction:'asc'}}},{revision:4,boundVersionId:id,tableState:{pageSize:'10'}}])assert.throws(()=>parsePatchWorkspace(input));
 assert.doesNotThrow(()=>parsePatchWorkspace({revision:4,boundVersionId:id,selection:{cell:null,columnIds:[]},tableState:{sort:null}}));
 assert.doesNotThrow(()=>parsePatchWorkspace({revision:1,boundVersionId:null,chartConfig:{xColumnId:null}}));
});
test('canonical hash normalization preserves data and selection order',()=>{
 assert.equal(canonicalRequest({b:2,a:1}),canonicalRequest({a:1,b:2}));
 assert.notEqual(canonicalRequest({value:' a'}),canonicalRequest({value:'a'}));
 assert.notEqual(canonicalRequest({value:'é'}),canonicalRequest({value:'e\u0301'}));
 assert.notEqual(canonicalRequest([1,2]),canonicalRequest([2,1]));
 assert.throws(()=>canonicalRequest({a:undefined}));
});

const {parseRegister,parseLogin,parseEmptyBody}=require('../dist/modules/auth/dto/auth.validation');
const {parsePatchUser}=require('../dist/modules/users/dto/user.validation');
const {publicUser,registerResponse,loginResponse,patchUserResponse}=require('../dist/modules/users/dto/user-response.mapper');
const {parseProjectName,parseListProjects}=require('../dist/modules/projects/dto/project.validation');
const {parseRowsQuery}=require('../dist/modules/datasets/dto/dataset-query.validation');
const {parseSummaryQuery,parseDistributionQuery,parseCorrelationQuery,parsePoints3dQuery,parseValueCountsQuery}=require('../dist/modules/analysis/dto/analysis-query.validation');
const {parseHistoryQuery,parseRestoreVersion}=require('../dist/modules/history/dto/history.validation');
const {compareCells,matchesCellFilter}=require('../dist/common/domain/cell-comparison');
const {buildDiagnostics}=require('../dist/modules/processing/preview-policy');
const {assertPreviewReadable}=require('../dist/modules/processing/preview-read-policy');
const {assertRestoreTarget}=require('../dist/modules/history/restore-policy');
const {failedRequestAction}=require('../dist/infrastructure/idempotency/retry-policy');
const {resourceParams,parseIdempotencyKey}=require('../dist/common/validation/request.validation');

test('ASCII email normalization and password byte length preserve passwords exactly',()=>{
 const password=' mật khẩu dài ';
 const registered=parseRegister({email:' USER+tag@Example.com ',password});
 assert.equal(registered.email,'user+tag@example.com');assert.equal(registered.password,password);
 assert.throws(()=>parseRegister({email:'tên@example.com',password}));
 assert.throws(()=>parseRegister({email:'a@example.com',password:'é'.repeat(37)}));
 assert.doesNotThrow(()=>parseRegister({email:'a@example.com',password:'é'.repeat(36)}));
 assert.doesNotThrow(()=>parseLogin({email:'a@example.com',password:'x'}));
 assert.throws(()=>parseLogin({email:'a@example.com',password:''}));
 assert.throws(()=>parseRegister({email:'a@example.com',password,displayName:'extra'}));
 assert.deepEqual(parseEmptyBody(undefined),{});assert.throws(()=>parseEmptyBody({token:'secret'}));
});
test('profile and project names count Unicode code points, support explicit clear, and keep normalization local',()=>{
 assert.equal(parseProjectName({name:'  e\u0301  '}).name,'e\u0301');
 assert.doesNotThrow(()=>parseProjectName({name:'😀'.repeat(100)}));
 assert.throws(()=>parseProjectName({name:'😀'.repeat(101)}));
 assert.throws(()=>parsePatchUser({displayName:'  '}));
 assert.deepEqual(parsePatchUser({displayName:null}),{displayName:null});
 assert.deepEqual(parsePatchUser({displayName:' A ',preferences:{}}),{displayName:'A'});
 assert.throws(()=>parsePatchUser({preferences:{}}));
 assert.throws(()=>parsePatchUser({preferences:{theme:null}}));
 assert.deepEqual(parsePatchUser({preferences:{theme:'system'}}),{preferences:{theme:'system'}});
});
test('public user projection cannot leak database fields or nested preferences secrets',()=>{
 const source={_id:id,email:'a@example.com',displayName:null,createdAt:new Date(0),updatedAt:new Date(0),passwordHash:'secret',preferences:{theme:'dark',internal:'secret'}};
 const result=publicUser(source);assert.equal(result.createdAt,'1970-01-01T00:00:00.000Z');assert.deepEqual(result.preferences,{theme:'dark'});
 for(const response of [result,registerResponse(source),loginResponse(source,'access',900),patchUserResponse(source)])assert.equal(JSON.stringify(response).includes('secret'),false);
 assert.equal(Object.hasOwn(registerResponse(source).user,'updatedAt'),false);
 assert.equal(Object.hasOwn(loginResponse(source,'access',900).user,'createdAt'),false);
 assert.deepEqual(publicUser({...source,preferences:undefined}).preferences,{theme:'system'});
});
test('query grammar rejects repeated/unknown fields and typed string coercion traps',()=>{
 assert.equal(parseListProjects({}).sort,'-updatedAt');
 assert.equal(parseListProjects({sort:'name',lifecycle:'empty'}).lifecycle,'empty');
 for(const query of [{page:'01'},{page:['1','2']},{limit:'101'},{sort:'unknown'},{foo:'x'},{lifecycle:'deleting'}])assert.throws(()=>parseListProjects(query));
 assert.equal(parseValueCountsQuery({includeMissing:'false'}).includeMissing,false);
 assert.throws(()=>parseValueCountsQuery({includeMissing:'FALSE'}));
 assert.throws(()=>parseValueCountsQuery({includeMissing:['true','false']}));
 assert.equal(parseSummaryQuery({outlierMethod:'zscore'}).outlierThreshold,3);
 assert.equal(parseSummaryQuery({outlierThreshold:'1e-3'}).outlierThreshold,0.001);
 assert.throws(()=>parseSummaryQuery({threshold:'3'})); // Preserve existing summary field name.
 assert.throws(()=>parseSummaryQuery({outlierThreshold:'1e999'}));
 assert.equal(parseDistributionQuery({bins:'250'}).bins,250); // No new bins=100 cap.
 assert.equal(parseCorrelationQuery({}).method,'pearson');
 assert.throws(()=>parseCorrelationQuery({method:'category'}));
 assert.equal(parseHistoryQuery({}).limit,20);assert.throws(()=>parseHistoryQuery({kind:['process','restore']}));
});
test('query filters and autosave filters share operator rules and keep typed values intact',()=>{
 const filters=[{columnId:col,op:'contains',value:{kind:'text',value:' A '}}];
 assert.deepEqual(parseRowsQuery({filters:JSON.stringify(filters)}).filters,filters);
 assert.deepEqual(parsePatchWorkspace({revision:4,boundVersionId:id,tableState:{filters}}).tableState.filters,filters);
 for(const op of ['lt','lte','gt','gte']){
  const bad=[{columnId:col,op,value:{kind:'text',value:'1'}}];
  assert.throws(()=>parseRowsQuery({filters:JSON.stringify(bad)}));
  assert.throws(()=>parsePatchWorkspace({revision:4,boundVersionId:id,tableState:{filters:bad}}));
 }
 assert.throws(()=>parseRowsQuery({filters:'{'}));
 assert.throws(()=>parseRowsQuery({sort:col+':asc:extra'}));
 assert.equal(parsePoints3dQuery({xColumnId:col,yColumnId:col,zColumnId:col}).maxPoints,10000);
 assert.throws(()=>parsePoints3dQuery({xColumnId:col,yColumnId:col,zColumnId:col,maxPoints:'10001'}));
});
test('missing sorts last in either direction; Unicode equality stays exact while contains is insensitive',()=>{
 const missing={kind:'text',value:'N/A'}, number={kind:'number',value:1};
 assert.equal(compareCells(missing,number,'asc'),1);assert.equal(compareCells(missing,number,'desc'),1);
 assert.equal(compareCells(number,{kind:'text',value:'0'}),-1);
 assert.equal(compareCells({kind:'boolean',value:false},{kind:'boolean',value:true}),-1);
 assert.equal(matchesCellFilter({kind:'text',value:'Alpha'},{columnId:col,op:'contains',value:{kind:'text',value:'PH'}}),true);
 assert.equal(matchesCellFilter({kind:'text',value:'é'},{columnId:col,op:'contains',value:{kind:'text',value:'e\u0301'}}),false);
 assert.equal(matchesCellFilter(number,{columnId:col,op:'eq',value:{kind:'text',value:'1'}}),false);
 assert.equal(matchesCellFilter(missing,{columnId:col,op:'isMissing'}),true);
});
test('number/date/time and encoding parameters are validated without AI-picked limits',()=>{
 const cols={type:'columns',columnIds:[col]};
 assert.equal(parseCreatePreview(request('convert_number',{decimalSeparator:',',allowThousands:true},cols)).specification.parameters.decimalSeparator,',');
 assert.throws(()=>parseCreatePreview(request('convert_date',{inputFormat:'DD/MM/YYYY'},cols)));
 assert.throws(()=>parseCreatePreview(request('convert_datetime',{timezone:'Invalid/Zone'},cols)));
 assert.equal(parseCreatePreview(request('convert_datetime',{},cols)).specification.parameters.timezone,'UTC');
 assert.throws(()=>parseCreatePreview(request('convert_boolean',{trueValues:['YES'],falseValues:['yes']},cols)));
 assert.throws(()=>parseCreatePreview(request('ordinal',{mapping:[{value:{kind:'null',value:null},label:1}]},cols)));
 const ordinal=parseCreatePreview(request('ordinal',{mapping:[{value:{kind:'text',value:'a'},label:-0.5}],keepSource:true},cols));
 assert.equal(ordinal.specification.parameters.mapping[0].label,-0.5);
});
test('resource ID normalization never lowercases user data or changes selection order',()=>{
 const upper='ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF';
 const parsed=parseCreatePreview(request('edit_cell',{value:{kind:'text',value:upper}},{type:'cell',rowId:upper,columnId:upper}));
 assert.equal(parsed.specification.scope.rowId,upper.toLowerCase());
 assert.equal(parsed.specification.parameters.value.value,upper);
 assert.deepEqual(resourceParams(['projectId'])({projectId:id.toUpperCase()}),{projectId:id});
 assert.equal(parseRestoreVersion({expectedCurrentVersionId:id.toUpperCase()}).expectedCurrentVersionId,id);
 assert.equal(parseIdempotencyKey(' key '),' key ');assert.throws(()=>parseIdempotencyKey('   '));
});
test('diagnostics sample cap does not hide total counts or lose error priority',()=>{
 const errors=Array.from({length:120},()=>({code:'DOMAIN_ERROR',message:'Lỗi'}));
 const warnings=Array.from({length:10},()=>({code:'WARN',message:'Cảnh báo'}));
 const result=buildDiagnostics(errors,warnings);assert.equal(result.errorCount,120);assert.equal(result.warningCount,10);assert.equal(result.errors.length,100);assert.equal(result.warnings.length,0);assert.equal(result.truncated,true);
 const mixed=buildDiagnostics(errors.slice(0,90),warnings.concat(warnings));assert.equal(mixed.errors.length+mixed.warnings.length,100);assert.equal(mixed.warningCount,20);
});
test('restore and preview lifecycle preserve receipt-before-state contract and distinguish expired from purged',()=>{
 assert.throws(()=>assertRestoreTarget({_id:id,datasetId:id,state:'published'},id,id),e=>e.getStatus()===409&&code(e)==='NO_CHANGES_TO_RESTORE');
 for(const target of [null,{_id:'f'.repeat(24),datasetId:id,state:'staged'}])assert.throws(()=>assertRestoreTarget(target,id,id),e=>e.getStatus()===404);
 assert.doesNotThrow(()=>assertRestoreTarget({_id:'f'.repeat(24),datasetId:id,state:'published'},id,id));
 assert.throws(()=>assertPreviewReadable(null,new Date(10)),e=>e.getStatus()===404);
 assert.throws(()=>assertPreviewReadable({expiresAt:new Date(10)},new Date(10)),e=>e.getStatus()===410);
 assert.doesNotThrow(()=>assertPreviewReadable({expiresAt:new Date(11)},new Date(10)));
 assert.equal(failedRequestAction({failure:'deterministic',rollbackConfirmed:true}),'replay-error');
 assert.equal(failedRequestAction({failure:'transient',rollbackConfirmed:true}),'claim-with-cas');
 assert.equal(failedRequestAction({failure:'transient',rollbackConfirmed:false}),'recover');
});
