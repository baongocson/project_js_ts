import test from 'node:test';
import assert from 'node:assert/strict';
import { importCsv,type Snapshot } from '@dashboard/data-core';
import { localAnalysis,onlineAnalysis } from '../../src/features/analysis/services/analysis-service';

function snapshot(source:string){let id=0;return importCsv(new TextEncoder().encode(source),{delimiter:','},()=>`id-${++id}`);}
void test('local analysis uses full typed snapshot, pair counts/N/A, complete frequency denominator and stable sampling',async()=>{
  const data=snapshot('x,y,z,c,t\n'+Array.from({length:120},(_,i)=>`${i===119?'':i+1},${2*(i+1)},${3*(i+1)},5,${i%2?'b':'a'}`).join('\n'));
  const [x,y,z,c,t]=data.columns.map(column=>column.columnId),api=localAnalysis(data,'local',999);
  const summary=await api.summary({outlierMethod:'iqr',outlierThreshold:1.5});assert.equal(summary.rowCount,120);assert.equal(summary.originalByteSize,999);assert.equal(summary.missingCount,1);
  const correlation=await api.correlation();assert.equal(correlation.matrix[0][1],1);assert.equal(correlation.validPairCounts[0][1],119);assert.equal(correlation.matrix[3][3],null);assert.equal(correlation.matrix[0][4],null);
  assert(correlation.naReasons.some(item=>item.rowColumnId===c&&item.reason==='constant_column'));
  const counts=await api.counts(t,{page:1,limit:1,sort:'-count',includeMissing:true});assert.equal(counts.totalPages,2);assert.equal(counts.items[0].count,60);assert.equal(counts.items[0].rate,.5);
  const query={xColumnId:x,yColumnId:y,zColumnId:z,colorMode:'normal' as const,outlierMethod:'iqr' as const,threshold:1.5,maxPoints:100};
  const points=await api.points(query);assert.equal(points.hiddenMissingCoordsCount,1);assert.deepEqual(points.sampling,{applied:true,totalEligible:119,returned:100,method:'stable-rowid'});assert.deepEqual((await api.points(query)).points,points.points);
  const row=await api.row(points.points[0].rowId);assert.equal(row.cells[x].value,points.points[0].x);
});
void test('empty/all-missing/constant and invalid/missing coordinate semantics do not impute zero',async()=>{
  const empty=snapshot('x,y\n'),emptyApi=localAnalysis(empty,'v',4);assert.equal((await emptyApi.summary({outlierMethod:'iqr',outlierThreshold:1.5})).missingRate,null);assert.equal((await emptyApi.correlation()).matrix[0][0],null);
  const data:Snapshot={columns:[{columnId:'x',name:'x',position:0,logicalType:'number',format:null,lineage:null}],rows:[{rowId:'missing',position:0,cells:{x:{kind:'null',value:null}}},{rowId:'invalid',position:1,cells:{x:{kind:'text',value:'abc'}}},{rowId:'number',position:2,cells:{x:{kind:'number',value:5}}}]};
  const api=localAnalysis(data,'v',10),query={xColumnId:'x',yColumnId:'x',zColumnId:'x',colorMode:'normal' as const,outlierMethod:'iqr' as const,threshold:1.5,maxPoints:100};
  const result=await api.points(query);assert.equal(result.hiddenMissingCoordsCount,1);assert.equal(result.hiddenInvalidCoordsCount,1);assert.equal(result.points.length,1);assert.equal((await api.distribution('x',{bins:20,outlierMethod:'iqr',threshold:1.5})).reason,'constant_column');
  const missing=localAnalysis(snapshot('x\nN/A\n" "\n'),'v',4);const column=(snapshot('x\nN/A\n" "\n')).columns[0].columnId;assert.equal((await missing.distribution(column,{bins:20,outlierMethod:'iqr',threshold:1.5})).reason,'non_numeric');
  await assert.rejects(api.row('absent'),/Không tìm thấy dòng/);
  const abort=new AbortController();abort.abort();await assert.rejects(api.summary({outlierMethod:'iqr',outlierThreshold:1.5},abort.signal),{name:'AbortError'});
});
void test('online analysis serializes outlier columns with the existing comma-separated query contract',async()=>{
  let requested='';globalThis.fetch=async input=>{requested=String(input);return Response.json({});};
  await onlineAnalysis('dataset','version').summary({outlierMethod:'iqr',outlierThreshold:1.5,outlierColumnIds:['a','b']});
  const url=new URL(requested,'https://example.test');assert.equal(url.searchParams.get('outlierColumnIds'),'a,b');assert.equal(url.searchParams.get('outlierThreshold'),'1.5');
});

void test('boxplot moments use full numeric column values and remain finite for extreme magnitudes',()=>{
  const data=snapshot('value\n1\n2\n3\n');
  const id=data.columns[0].columnId;
  assert.deepEqual(localAnalysis(data,'v',0).moments?.(id),{mean:2,deviation:Math.sqrt(2/3)});
  const large:Snapshot={...data,rows:data.rows.map((row,index)=>({...row,cells:{[id]:{kind:'number',value:[-1e308,0,1e308][index]}}}))};
  const moments=localAnalysis(large,'v',0).moments?.(id);
  assert.equal(moments?.mean,0);
  assert.equal(moments?.deviation,Math.sqrt(2/3)*1e308);
  assert.equal(localAnalysis({...data,rows:[]},'v',0).moments?.(id),null);
});
