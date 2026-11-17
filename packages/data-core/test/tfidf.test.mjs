import test from 'node:test';
import assert from 'node:assert/strict';
import { importCsv,processSnapshot,projectPreview,compatibleEngine,ENGINE_VERSION } from '../dist/esm/index.js';
import { createRequire } from 'node:module';
const cjs=createRequire(import.meta.url)('../dist/index.js');
function base(csv='t\nCat cat dog\nDog fish\n""\n'){let i=0;return importCsv(new TextEncoder().encode(csv),{delimiter:','},()=>`id-${++i}`);}
function spec(data,parameters={}){return {method:'tfidf',scope:{type:'columns',columnIds:[data.columns[0].columnId]},parameters:{lowercase:true,minDf:1,maxFeatures:100,norm:'none',sublinearTf:false,keepSource:true,...parameters},statisticsScope:{type:'whole-columns'}};}
test('TF-IDF uses smoothed IDF over all documents, preserves identity and zero vectors; ESM/CJS parity',()=>{
  const data=base(),before=structuredClone(data),s=spec(data),result=processSnapshot(data,s);
  assert.deepEqual(result.errors,[]);assert.equal(result.canApply,true);assert.deepEqual(data,before);assert.deepEqual(result,cjs.processSnapshot(data,s));
  const columns=result.snapshot.columns.slice(1);assert.deepEqual(columns.map(c=>c.lineage.category.value),['cat','dog','fish']);
  const weights=result.snapshot.rows[0].cells;assert(Math.abs(weights[columns[0].columnId].value-2*(1+Math.log(2)))<1e-12);assert(Math.abs(weights[columns[1].columnId].value-(1+Math.log(4/3)))<1e-12);
  assert(columns.every(c=>result.snapshot.rows[2].cells[c.columnId].value===0));assert.deepEqual(result.snapshot.rows.map(r=>r.rowId),data.rows.map(r=>r.rowId));
  assert.equal(projectPreview(data,result.snapshot,s).summary.after.columnCount,4);
});
test('TF-IDF honors minDf/maxFeatures, lowercase, sublinear TF, L2, keepSource, Unicode and invalid input atomically',()=>{
  const data=base('t\nMèo mèo chó\nchó cá\n""\n');
  const result=processSnapshot(data,spec(data,{maxFeatures:2,norm:'l2',sublinearTf:true,keepSource:false}));assert.equal(result.snapshot.columns.length,2);
  assert.deepEqual(result.snapshot.columns.map(c=>c.lineage.category.value),['chó','cá']);
  for(const row of result.snapshot.rows.slice(0,2)){const norm=Object.values(row.cells).reduce((sum,c)=>sum+c.value*c.value,0);assert(Math.abs(norm-1)<1e-12);}
  const frequent=processSnapshot(data,spec(data,{minDf:2}));assert.deepEqual(frequent.snapshot.columns.slice(1).map(c=>c.lineage.category.value),['chó']);
  const caseResult=processSnapshot(data,spec(data,{lowercase:false}));assert(caseResult.snapshot.columns.some(c=>c.lineage?.category?.value==='Mèo'));
  for(const p of [{minDf:0},{maxFeatures:1001},{norm:'bad'},{lowercase:'yes'},{minDf:99}]){const invalid=processSnapshot(data,spec(data,p));assert.equal(invalid.canApply,false);assert.equal(invalid.snapshot,data);}
  const numeric=base('t\n1\n2\n');assert.equal(processSnapshot(numeric,spec(numeric)).errors[0].code,'NON_TEXT_COLUMN');
  const wrong=spec(data);wrong.scope={type:'dataset'};assert.equal(processSnapshot(data,wrong).canApply,false);
});
test('engine upgrade accepts old method receipts but TF-IDF requires its own matching engine',()=>{
  assert(compatibleEngine('data-core-unified-0.6.0',ENGINE_VERSION,'square'));assert(!compatibleEngine('data-core-unified-0.6.0',ENGINE_VERSION,'tfidf'));assert(!compatibleEngine('future',ENGINE_VERSION));
});
