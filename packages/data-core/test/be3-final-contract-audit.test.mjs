import test from 'node:test';
import assert from 'node:assert/strict';
import { processSnapshot } from '../dist/esm/index.js';
const col=(id,type='text',name=id)=>({columnId:id,name,position:0,logicalType:type,format:null,lineage:null});
const snap=(values,type='text',name='x')=>({columns:[col('x',type,name)],rows:values.map((cell,i)=>({rowId:`r${i}`,position:i,cells:{x:cell}}))});
const text=value=>({kind:'text',value});
const number=value=>({kind:'number',value});
const nullCell={kind:'null',value:null};
const spec=(method,parameters)=>({method,parameters,scope:{type:'columns',columnIds:['x']},statisticsScope:{type:'whole-columns'}});
const run=(snapshot,method,parameters)=>processSnapshot(snapshot,spec(method,parameters));
const check=(snapshot,method,parameters,expected)=>{const output=run(snapshot,method,parameters);assert.equal(output.canApply,true,JSON.stringify(output.errors));assert.equal(output.snapshot.rows[0].cells.x.value,expected);};

test('D07 convert_number trims and parses exponent without silently coercing an unsafe integer',()=>{
  check(snap([text('  +1.25e+2  ')]),'convert_number',{decimalSeparator:'.',allowThousands:false},125);
  check(snap([text('1.234,5E-1')]),'convert_number',{decimalSeparator:',',allowThousands:true},123.45);
  const unsafe=run(snap([text('9007199254740993')]),'convert_number',{decimalSeparator:'.',allowThousands:false});
  assert.equal(unsafe.errors[0].code,'NUMERIC_PRECISION_LOSS');
  assert.equal(unsafe.canApply,false);
});

test('D09 IANA wall time resolves standard offset and source offset wins',()=>{
  check(snap([text('2026-11-16T15:29:00')]),'convert_datetime',{inputFormat:'ISO8601',timezone:'Asia/Ho_Chi_Minh'},'2026-11-16T08:29:00.000Z');
  check(snap([text('2026-11-16T15:29:00+02:00')]),'convert_datetime',{inputFormat:'ISO8601',timezone:'America/New_York'},'2026-11-16T13:29:00.000Z');
});

test('D09 rejects ambiguous fall DST and nonexistent spring DST, leaves source unchanged',()=>{
  const params={inputFormat:'ISO8601',timezone:'America/New_York'};
  const ambiguous=snap([text('2026-11-01T01:30:00')]);
  const missing=snap([text('2026-03-08T02:30:00')]);
  for(const [input,expected] of [[ambiguous,'DATETIME_AMBIGUOUS'],[missing,'DATETIME_NONEXISTENT']]){
    const output=run(input,'convert_datetime',params);
    assert.equal(output.canApply,false);assert.equal(output.errors[0]?.code,expected);assert.equal(output.snapshot,input);
  }
});

test('D10 converts date at local midnight and datetime to UTC date',()=>{
  check(snap([{kind:'date',value:'2026-11-16'}],'date'),'convert_datetime',{inputFormat:'ISO8601',timezone:'Asia/Ho_Chi_Minh'},'2026-11-15T17:00:00.000Z');
  check(snap([{kind:'datetime',value:'2026-11-16T23:30:00-03:00'}],'datetime'),'convert_date',{inputFormat:'YYYY-MM-DD'},'2026-11-17');
});

test('strip_html removes script/style content in addition to markup, optionally decodes entities',()=>{
  const src=snap([text('<b>Hi</b><script>alert(1)</script><style>.x{}</style> &amp; bye')]);
  check(src,'strip_html',{decodeEntities:true},'Hi & bye');
});

test('D14 one_hot leaves generated numeric columns null when missingCategory=false',()=>{
  const src=snap([text('A'),nullCell]);
  const result=run(src,'one_hot',{keepSource:false,missingCategory:false,asCategory:false});
  assert.equal(result.canApply,true,JSON.stringify(result.errors));
  assert.equal(result.snapshot.columns[0].logicalType,'number');
  const id=result.snapshot.columns[0].columnId;
  assert.deepEqual(result.snapshot.rows[0].cells[id],number(1));
  assert.deepEqual(result.snapshot.rows[1].cells[id],nullCell);
});

test('D11 one_hot number requires asCategory and generated values are numeric',()=>{
  const src=snap([number(2),number(3)],'number');
  const invalid=run(src,'one_hot',{keepSource:false,missingCategory:false,asCategory:false});
  assert.equal(invalid.errors[0]?.code,'UNSUPPORTED_CATEGORY_TYPE');
  const result=run(src,'one_hot',{keepSource:false,missingCategory:false,asCategory:true});
  assert.equal(result.canApply,true,JSON.stringify(result.errors));
  assert.ok(result.snapshot.columns.every(c=>c.logicalType==='number'));
  assert.ok(Object.values(result.snapshot.rows[0].cells).every(c=>c.kind==='number'));
});

test('D15 ordinal forbids superfluous mapping categories',()=>{
  const src=snap([text('A'),text('B')]);
  const output=run(src,'ordinal',{keepSource:false,mapping:[
    {value:text('A'),label:0},{value:text('B'),label:1},{value:text('C'),label:2},
  ]});
  assert.equal(output.canApply,false);assert.equal(output.errors[0].code,'INVALID_MAPPING');
});
