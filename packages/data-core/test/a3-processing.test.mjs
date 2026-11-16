import test from 'node:test';
import assert from 'node:assert/strict';
import { processSnapshot } from '../dist/esm/index.js';
const spec = (method, scope, parameters) => ({ method, scope, parameters, statisticsScope: { type: 'whole-columns' } });
const base = () => ({
  columns: [
    { columnId: 'txt', name: 'Text', position: 0, logicalType: 'text' },
    { columnId: 'number', name: 'Number', position: 1, logicalType: 'number' },
  ],
  rows: [
    { rowId: '1', position: 0, cells: { txt: { kind: 'text', value: ' Hello  <b>World</b> &amp;  ' }, number: { kind: 'number', value: 4 } } },
    { rowId: '2', position: 1, cells: { txt: { kind: 'text', value: 'N/A' }, number: { kind: 'number', value: 5 } } },
  ],
});
const at = (r, row = 0, col = 'txt') => r.snapshot.rows[row].cells[col];
test('cleaning: trim, collapse and remove are explicit and immutable', () => {
  const s = base(); const original = JSON.stringify(s);
  for (const [mode, value] of [['trim', 'Hello  <b>World</b> &amp;'], ['collapse', 'Hello <b>World</b> &amp;'], ['remove', 'Hello<b>World</b>&amp;']]) {
    const r = processSnapshot(s, spec('normalize_whitespace', {type:'columns',columnIds:['txt']}, {mode}));
    assert.equal(at(r).value, value); assert.equal(at(r,1).value, 'N/A'); assert.equal(r.canApply, true);
  }
  assert.equal(JSON.stringify(s), original);
});
test('cleaning: remove html and decode known entities', () => {
  const r = processSnapshot(base(), spec('strip_html', {type:'dataset'}, {decodeEntities:true}));
  assert.equal(at(r).value, ' Hello  World &  ');
  assert.equal(at(r,1).value,'N/A');
});
test('cleaning: uppercase, lowercase, typed replace exact', () => {
  const s = base();
  assert.equal(at(processSnapshot(s,spec('uppercase',{type:'columns',columnIds:['txt']},{}))).value, ' HELLO  <B>WORLD</B> &AMP;  ');
  assert.equal(at(processSnapshot(s,spec('lowercase',{type:'columns',columnIds:['txt']},{}))).value, ' hello  <b>world</b> &amp;  ');
  const r = processSnapshot(s,spec('replace_value',{type:'columns',columnIds:['txt']},{from:{kind:'text',value:'N/A'},to:{kind:'text',value:'Replaced'},match:'exact'}));
  assert.equal(at(r,1).value,'Replaced'); assert.equal(r.changes.length,1);
});
test('cleaning: remove duplicates keeps first stable row ID and order', () => {
  const s = base(); s.rows.push({ ...structuredClone(s.rows[0]), rowId:'3',position:2 });
  const r=processSnapshot(s,spec('remove_duplicates',{type:'dataset'},{keep:'first'}));
  assert.equal(r.canApply,true); assert.deepEqual(r.snapshot.rows.map(row=>row.rowId),['1','2']);
  assert.equal(s.rows.length,3);
});
test('cleaning: exact duplicates are typed, not string-coerced',()=>{
  const s={columns:[{columnId:'x',name:'X',position:0,logicalType:'mixed'}],rows:[{rowId:'a',position:0,cells:{x:{kind:'number',value:1}}},{rowId:'b',position:1,cells:{x:{kind:'text',value:'1'}}}]};
  const r=processSnapshot(s,spec('remove_duplicates',{type:'dataset'},{keep:'first'}));
  assert.equal(r.canApply,false);
});
test('conversion: number decimal separator and grouped thousands with schema change',()=>{
  const s={columns:[{columnId:'v',name:'V',position:0,logicalType:'text'}],rows:[{rowId:'a',position:0,cells:{v:{kind:'text',value:'1.234,5'}}}]};
  const r=processSnapshot(s,spec('convert_number',{type:'columns',columnIds:['v']},{decimalSeparator:',',allowThousands:true}));
  assert.equal(r.canApply,true); assert.equal(r.snapshot.rows[0].cells.v.value,1234.5);
  assert.equal(r.snapshot.columns[0].logicalType,'number'); assert.equal(r.schemaChanges[0].before,'text');
  assert.equal(s.columns[0].logicalType,'text');
  const bad=processSnapshot(s,spec('convert_number',{type:'dataset'},{decimalSeparator:',',allowThousands:false}));
  assert.equal(bad.canApply,false); assert.equal(bad.errors[0].code,'INVALID_NUMBER'); assert.equal(bad.snapshot,s);
});
test('conversion: text is canonical and no implicit trim',()=>{
  const r=processSnapshot(base(),spec('convert_text',{type:'columns',columnIds:['number']},{format:'canonical'}));
  assert.equal(at(r,0,'number').value,'4'); assert.equal(r.snapshot.columns[1].logicalType,'text');
});
test('conversion: strict Gregorian date with leap-year check',()=>{
  const s={columns:[{columnId:'d',name:'D',position:0,logicalType:'text'}],rows:[{rowId:'a',position:0,cells:{d:{kind:'text',value:'2024-02-29'}}}]};
  const r=processSnapshot(s,spec('convert_date',{type:'dataset'},{inputFormat:'YYYY-MM-DD'}));
  assert.deepEqual(r.snapshot.rows[0].cells.d,{kind:'date',value:'2024-02-29'});
  s.rows[0].cells.d.value='2026-02-29';
  assert.equal(processSnapshot(s,spec('convert_date',{type:'dataset'},{inputFormat:'YYYY-MM-DD'})).errors[0].code,'INVALID_DATE');
});
test('conversion: ISO datetime explicit timezone; ambiguous timestamps rejected',()=>{
  const s={columns:[{columnId:'d',name:'D',position:0,logicalType:'text'}],rows:[{rowId:'a',position:0,cells:{d:{kind:'text',value:'2026-11-16T15:29:00+07:00'}}}]};
  const r=processSnapshot(s,spec('convert_datetime',{type:'dataset'},{inputFormat:'ISO8601',timezone:'UTC'}));
  assert.equal(r.snapshot.rows[0].cells.d.value,'2026-11-16T08:29:00.000Z');
  s.rows[0].cells.d.value='2026-11-16T15:29:00';
  assert.equal(processSnapshot(s,spec('convert_datetime',{type:'dataset'},{inputFormat:'ISO8601',timezone:'UTC'})).snapshot.rows[0].cells.d.value,'2026-11-16T15:29:00.000Z');
});
test('conversion: boolean custom mapping and missing preservation',()=>{
  const s={columns:[{columnId:'b',name:'B',position:0,logicalType:'text'}],rows:[{rowId:'a',position:0,cells:{b:{kind:'text',value:'YES'}}},{rowId:'b',position:1,cells:{b:{kind:'text',value:'N/A'}}}]};
  const r=processSnapshot(s,spec('convert_boolean',{type:'dataset'},{trueValues:['yes'],falseValues:['no'],caseSensitive:false}));
  assert.equal(r.snapshot.rows[0].cells.b.value,true); assert.equal(r.snapshot.rows[1].cells.b.value,'N/A');
  assert.equal(r.snapshot.columns[0].logicalType,'boolean');
});
test('invalid values rollback all changes; no partial publication',()=>{
  const s={columns:[{columnId:'v',name:'V',position:0,logicalType:'text'}],rows:[{rowId:'a',position:0,cells:{v:{kind:'text',value:'5'}}},{rowId:'b',position:1,cells:{v:{kind:'text',value:'invalid'}}}]};
  const r=processSnapshot(s,spec('convert_number',{type:'dataset'},{decimalSeparator:'.',allowThousands:false}));
  assert.equal(r.canApply,false); assert.equal(r.snapshot,s); assert.equal(r.changes.length,0); assert.equal(r.schemaChanges.length,0);
});
