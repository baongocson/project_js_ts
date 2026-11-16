import test from 'node:test';
import assert from 'node:assert/strict';
import { processSnapshot, ENGINE_VERSION } from '../dist/esm/index.js';
const sp=(method,scope,parameters={})=>({method,scope,parameters,statisticsScope:{type:'whole-columns'}});
const cols=(...ids)=>({type:'columns',columnIds:ids});
const num=(...values)=>({columns:[{columnId:'n',name:'Number',position:0,logicalType:'number'}],rows:values.map((v,i)=>({rowId:`r${i}`,position:i,cells:{n:v===null?{kind:'null',value:null}:{kind:'number',value:v}}}))});
const val=(res)=>res.snapshot.rows.map(r=>r.cells.n?.value);
const exec=(s,m,p={},scope=cols('n'))=>processSnapshot(s,sp(m,scope,p));
const fail=(s,m,p,code)=>{const r=exec(s,m,p);assert.equal(r.canApply,false);assert.equal(r.errors[0]?.code,code);assert.equal(r.snapshot,s);assert.equal(r.changes.length,0);};
test('A4+A5 version is explicit',()=>assert.match(ENGINE_VERSION,/unified/));
test('fill_mean uses whole column, even for cell scope',()=>{
 const s=num(2,4,null);const r=exec(s,'fill_mean',{}, {type:'cell',rowId:'r2',columnId:'n'});
 assert.deepEqual(val(r),[2,4,3]);assert.equal(s.rows[2].cells.n.kind,'null');assert.equal(r.changes.length,1);
});
test('fill_median uses linear interpolation on even list',()=>assert.deepEqual(val(exec(num(1,2,10,20,null),'fill_median')),[1,2,10,20,6]));
test('fill_max fills only missing cells',()=>assert.deepEqual(val(exec(num(3,8,null),'fill_max')),[3,8,8]));
test('fill_mode uses typed ascending as tie break',()=>{
 const s={columns:[{columnId:'x',name:'x',position:0,logicalType:'text'}],rows:['b','a',null].map((v,i)=>({rowId:`r${i}`,position:i,cells:{x:v===null?{kind:'null',value:null}:{kind:'text',value:v}}}))};
 const r=processSnapshot(s,sp('fill_mode',cols('x'),{tieBreak:'typed-ascending'}));assert.equal(r.snapshot.rows[2].cells.x.value,'a');
});
test('fill_mean refuses all missing, invalid type and never partially writes',()=>{fail(num(null,null),'fill_mean',{},'ALL_MISSING_COLUMN');const s=num(1,null);s.rows.push({rowId:'r2',position:2,cells:{n:{kind:'text',value:'bad'}}});fail(s,'fill_mean',{},'NON_NUMERIC_COLUMN');});
test('drop_missing_rows any/all semantics and no source mutation',()=>{
 const s={columns:['a','b'].map((id,i)=>({columnId:id,name:id,position:i,logicalType:'mixed'})),rows:[
  {rowId:'1',position:0,cells:{a:{kind:'number',value:1},b:{kind:'text',value:'N/A'}}},
  {rowId:'2',position:1,cells:{a:{kind:'null',value:null},b:{kind:'text',value:' '}}},
  {rowId:'3',position:2,cells:{a:{kind:'number',value:2},b:{kind:'number',value:3}}}]};
 const any=processSnapshot(s,sp('drop_missing_rows',{type:'dataset'},{condition:'any'}));
 const all=processSnapshot(s,sp('drop_missing_rows',{type:'dataset'},{condition:'all'}));
 assert.deepEqual(any.snapshot.rows.map(r=>r.rowId),['3']);assert.deepEqual(all.snapshot.rows.map(r=>r.rowId),['1','3']);assert.equal(s.rows.length,3);
});
test('drop_missing_columns cleans corresponding cells',()=>{
 const s={columns:[{columnId:'a',name:'a',position:0,logicalType:'mixed'},{columnId:'b',name:'b',position:1,logicalType:'number'}],rows:[{rowId:'x',position:0,cells:{a:{kind:'text',value:'N/A'},b:{kind:'number',value:1}}}]};
 const r=processSnapshot(s,sp('drop_missing_columns',{type:'dataset'},{condition:'any'}));assert.deepEqual(r.snapshot.columns.map(c=>c.columnId),['b']);assert.deepEqual(Object.keys(r.snapshot.rows[0].cells),['b']);
});
test('clip_iqr uses linear quartiles; rejects zero IQR',()=>{
 assert.deepEqual(val(exec(num(1,2,3,4,100),'clip_iqr',{factor:1.5})),[1,2,3,4,7]);
 fail(num(1,1,1,1),'clip_iqr',{factor:1.5},'ZERO_SPREAD');
});
test('clip_zscore uses population ddof 0',()=>{
 const s=num(0,0,10),r=exec(s,'clip_zscore',{threshold:1});
 const mean=10/3,std=Math.sqrt(((mean**2)*2+(10-mean)**2)/3);
 assert.ok(Math.abs(val(r)[2]-(mean+std))<1e-10);
 fail(num(2,2,2),'clip_zscore',{threshold:2},'ZERO_VARIANCE');
});
test('scale_minmax preserves bounds and validates constant column',()=>{
 assert.deepEqual(val(exec(num(2,4,6),'scale_minmax',{rangeMin:-1,rangeMax:1})),[-1,0,1]);
 fail(num(4,4),'scale_minmax',{rangeMin:0,rangeMax:1},'ZERO_SPREAD');
});
test('standardize population sd',()=>{
 const result=val(exec(num(2,4,6),'standardize'));
 assert.equal(result[1],0);assert.ok(Math.abs(result[0]+Math.sqrt(1.5))<1e-10);
 fail(num(1,1,1),'standardize',{},'ZERO_VARIANCE');
});
test('log1p accepts -0.5, rejects <= -1 without partial write',()=>{
 const r=exec(num(-0.5,0,1),'log1p');assert.ok(Math.abs(val(r)[0]-Math.log(0.5))<1e-10);
 fail(num(2,-1),'log1p',{},'INVALID_NUMERIC_RESULT');
});
test('square refuses overflow without partial write',()=>{
 assert.deepEqual(val(exec(num(-2,3),'square')),[4,9]);fail(num(2,1e10),'square',{},'INVALID_NUMERIC_RESULT');
});
test('one_hot deterministic generated IDs, one-hot values, source immutable',()=>{
 const s={columns:[{columnId:'c',name:'Category',position:0,logicalType:'text'}],rows:['A','B','N/A'].map((v,i)=>({rowId:`r${i}`,position:i,cells:{c:{kind:'text',value:v}}}))};
 const options={keepSource:false,missingCategory:true,asCategory:false};
 const a=processSnapshot(s,sp('one_hot',cols('c'),options));
 const b=processSnapshot(s,sp('one_hot',cols('c'),options));
 assert.equal(a.canApply,true);assert.deepEqual(a.snapshot,b.snapshot);assert.equal(a.snapshot.columns.length,3);assert.equal(s.columns.length,1);
 assert.deepEqual(Object.values(a.snapshot.rows[0].cells).map(c=>c.value),[1,0,0]);
 assert.deepEqual(Object.values(a.snapshot.rows[2].cells).map(c=>c.value),[0,0,1]);
});
test('one_hot rejects >100 categories without mutation',()=>{
 const s={columns:[{columnId:'c',name:'c',position:0,logicalType:'text'}],rows:Array.from({length:101},(_,i)=>({rowId:`r${i}`,position:i,cells:{c:{kind:'text',value:`${i}`}}}))};
 const r=processSnapshot(s,sp('one_hot',cols('c'),{keepSource:true,missingCategory:false,asCategory:false}));assert.equal(r.errors[0].code,'TOO_MANY_CATEGORIES');assert.equal(r.snapshot,s);
});
test('ordinal mapping keepSource false and true, rejects unmapped',()=>{
 const s={columns:[{columnId:'c',name:'Category',position:0,logicalType:'text'}],rows:['B','A',null].map((v,i)=>({rowId:`r${i}`,position:i,cells:{c:v===null?{kind:'null',value:null}:{kind:'text',value:v}}}))};
 const mapping=[{value:{kind:'text',value:'A'},label:1},{value:{kind:'text',value:'B'},label:2}];
 const a=processSnapshot(s,sp('ordinal',cols('c'),{mapping,keepSource:false}));
 assert.deepEqual(a.snapshot.rows.map(r=>r.cells.c.value),[2,1,null]);assert.equal(a.snapshot.columns[0].logicalType,'number');
 const b=processSnapshot(s,sp('ordinal',cols('c'),{mapping,keepSource:true}));assert.equal(b.snapshot.columns.length,2);assert.equal(b.snapshot.rows[0].cells.c.value,'B');
 const bad=processSnapshot(s,sp('ordinal',cols('c'),{mapping:mapping.slice(0,1),keepSource:false}));assert.equal(bad.errors[0].code,'UNMAPPED_CATEGORY');assert.equal(bad.snapshot,s);
});
