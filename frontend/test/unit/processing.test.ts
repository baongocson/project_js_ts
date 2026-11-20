import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENGINE_VERSION,importCsv,processSnapshot,projectPreview,type ProcessingMethod,type ProcessingSpecification,type Scope,type Snapshot } from '@dashboard/data-core';
import { makeSpecification, methodGroups, presets } from '../../src/features/processing/methods';
import { previewCandidate } from '../../src/features/offline/domain/preview-candidate';
import type { Preview,PreviewChange } from '../../src/features/processing/types';

void test('workspace groups expose every contracted method exactly once and do not inherit old-only operations',()=>{
  const methods=Object.values(methodGroups).flat();
  assert.equal(methods.length,27);
  assert.equal(new Set(methods).size,27);
  assert.deepEqual([...methods].sort(),Object.keys(presets).filter(method=>method!=='edit_cell').sort());
  assert.deepEqual(methodGroups.outliers,['clip_iqr','clip_zscore']);
  assert.deepEqual(methodGroups.transformation,['log1p','square','tfidf']);
});

void test('all 28 fixture specifications validate through the form boundary and keep whole-column semantics',()=>{
  // Runner cwd is frontend; source fixtures remain the shared contract input.
  const fixtures=JSON.parse(readFileSync('../packages/data-core/fixtures/processing-acceptance.json','utf8')) as {method:ProcessingMethod;csv:string;parameters:Record<string,unknown>;column?:number;cell?:boolean;dataset?:boolean}[];
  for(const item of fixtures){
    let index=0;const base=importCsv(new TextEncoder().encode(item.csv),{delimiter:','},()=>`id-${index++}`);
    const columnId=base.columns[item.column??0].columnId;
    const scope:Scope=item.cell?{type:'cell',rowId:base.rows[0].rowId,columnId}:item.dataset?{type:'dataset'}:{type:'columns',columnIds:[columnId]};
    const spec=makeSpecification(item.method,item.parameters,scope);
    assert.equal(spec.statisticsScope.type,'whole-columns');assert.equal(processSnapshot(base,spec).canApply,true,item.method);
  }
});
void test('typed controls reject invalid enums, typed dates/numbers, overlap, scope and ordinal duplicates before local execution',()=>{
  const columns:Scope={type:'columns',columnIds:['c']};
  for(const [method,parameters,scope]of [
    ['normalize_whitespace',{mode:'invalid'},columns],['convert_number',{decimalSeparator:';'},columns],
    ['fill_constant',{value:{kind:'number',value:Infinity}},columns],['fill_constant',{value:{kind:'date',value:'2026-02-30'}},columns],
    ['convert_boolean',{trueValues:['yes'],falseValues:['YES'],caseSensitive:false},columns],
    ['ordinal',{mapping:[{value:{kind:'text',value:'a'},label:1},{value:{kind:'text',value:'b'},label:1}]},columns],
    ['scale_minmax',{rangeMin:2,rangeMax:1},columns],['edit_cell',{},columns],['remove_duplicates',{},columns],
  ] as [ProcessingMethod,Record<string,unknown>,Scope][])assert.throws(()=>makeSpecification(method,parameters,scope),method);
});
function fixture(){
  const base:Snapshot={columns:[{columnId:'c',name:'n',position:0,logicalType:'number',format:null,lineage:null}],rows:[{rowId:'r',position:0,cells:{c:{kind:'number',value:1}}}]};
  const next:Snapshot={...base,rows:[{rowId:'r',position:0,cells:{c:{kind:'number',value:2}}}]};
  const spec:ProcessingSpecification={method:'edit_cell',parameters:{value:{kind:'number',value:2}},scope:{type:'cell',rowId:'r',columnId:'c'},statisticsScope:{type:'whole-columns'}};
  const projection=projectPreview(base,next,spec);
  const preview:Preview={...projection,previewId:'p',status:'ready',canApply:true,baseVersionId:'v1',candidateVersionId:'v2',engineVersion:ENGINE_VERSION,specHash:'hash',expiresAt:new Date(Date.now()+60_000).toISOString(),diagnostics:{errorCount:0,warningCount:0,errors:[],warnings:[],truncated:false}};
  const changes:PreviewChange[]=projection.changes.map(change=>({...change,beforeCells:base.rows[0].cells,afterCells:next.rows[0].cells,diffColumnIds:['c']}));
  return {base,next,preview,changes};
}
void test('pre-Apply reconstruction validates complete typed rows and refuses malformed position/identity/base/schema',()=>{
  const {base,next,preview,changes}=fixture();assert.deepEqual(previewCandidate(base,preview,changes),next);
  for(const mutate of [
    (data:PreviewChange[])=>{data[0].beforeCells!.c={kind:'number',value:5};},
    (data:PreviewChange[])=>{data[0].afterPosition=2;},
    (data:PreviewChange[])=>{data[0].rowId='different';},
    (data:PreviewChange[])=>{data.push(structuredClone(data[0]));},
    (data:PreviewChange[])=>{delete data[0].afterCells!.c;},
  ]){const data=structuredClone(changes);mutate(data);assert.throws(()=>previewCandidate(base,preview,data),/preview/);}
  const invalid=structuredClone(preview);invalid.summary.after.columnCount=2;assert.throws(()=>previewCandidate(base,invalid,changes));
});
