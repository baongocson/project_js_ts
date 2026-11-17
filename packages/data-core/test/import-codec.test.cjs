const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { importCsv, parseCsv, encodeSnapshot, decodeSnapshot, LIMITS } = require('../dist');
const bytes = value => new TextEncoder().encode(value);
test('CSV preserves quoted newlines, BOM, duplicate/empty headers and source tokens', () => {
  const snapshot = importCsv(bytes('\ufeffa,a,\r\n00123,"a\r\nb","N/A"\r\n'), { delimiter: ',' }, randomUUID);
  assert.deepEqual(snapshot.columns.map(c => c.name), ['a', 'a', '']);
  assert.deepEqual(snapshot.columns.map(c => c.logicalType), ['text', 'text', 'text']);
  assert.equal(snapshot.rows[0].cells[snapshot.columns[1].columnId].value, 'a\r\nb');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(snapshot), snapshot.columns), snapshot);
});
test('inference checks whole columns and never rounds unsafe integers', () => {
  const snapshot = importCsv(bytes('a,b,c,d,e\n1,9007199254740993,true,2024-02-29,N/A\n2,4,false,2024-02-30, \n'), { delimiter: ',' }, randomUUID);
  assert.deepEqual(snapshot.columns.map(c => c.logicalType), ['number', 'text', 'boolean', 'text', 'text']);
  assert.equal(snapshot.rows[0].cells[snapshot.columns[0].columnId].rawToken, '1');
  assert.throws(() => importCsv(bytes('a\n1\nno'), { delimiter: ',', columnTypes: [{ position: 0, logicalType: 'number' }] }, randomUUID), error => error.details.issues[0].recordIndex === 3);
});
test('explicit overrides preserve raw tokens and validate conservative date/boolean/number conversion', () => {
  const snapshot = importCsv(bytes('a,b,c\n00123,TRUE,2024-02-29\n1,0,N/A'), { delimiter: ',', columnTypes: [{ position: 0, logicalType: 'number' }, { position: 1, logicalType: 'boolean' }, { position: 2, logicalType: 'date' }] }, randomUUID);
  assert.deepEqual(snapshot.rows[0].cells[snapshot.columns[0].columnId], { kind: 'number', value: 123, rawToken: '00123' });
  assert.deepEqual(snapshot.rows[0].cells[snapshot.columns[1].columnId], { kind: 'boolean', value: true, rawToken: 'TRUE' });
  assert.equal(snapshot.rows[1].cells[snapshot.columns[1].columnId].value, false);
  assert.equal(snapshot.rows[1].cells[snapshot.columns[2].columnId].value, 'N/A');
  assert.throws(() => importCsv(bytes('a\n9007199254740993'), { delimiter: ',', columnTypes: [{ position: 0, logicalType: 'number' }] }, randomUUID));
});
test('CSV reports logical records and physical lines without cell contents', () => {
  assert.throws(() => parseCsv(bytes('a,b\n"x\ny",z\n\n'), ','), error => error.details.issues[0].code === 'CSV_BLANK_RECORD' && error.details.issues[0].recordIndex === 3 && error.details.issues[0].lineStart === 4);
  for (const input of ['', 'a\n\n', 'a,b\nx', 'a\n"x', 'a\nx"y', 'a\n"x"y']) assert.throws(() => parseCsv(bytes(input), ','));
  assert.equal(importCsv(bytes('a\n'), { delimiter: ',' }, randomUUID).rows.length, 0);
  assert.equal(parseCsv(bytes('a\n""\n'), ',')[1].fields[0], '');
});
test('codec handles rows exceeding a chunk and split UTF-8 characters', () => {
  const snapshot = importCsv(bytes('a\n"' + 'é'.repeat(LIMITS.chunkBytes) + '"'), { delimiter: ',' }, randomUUID);
  const chunks = encodeSnapshot(snapshot);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= LIMITS.chunkBytes));
  assert.deepEqual(decodeSnapshot(chunks, snapshot.columns), snapshot);
  const small = importCsv(bytes('a\né'), { delimiter: ',' }, randomUUID);
  const tiny = encodeSnapshot(small);
  const slices = Array.from(tiny[0], byte => Uint8Array.of(byte));
  assert.deepEqual(decodeSnapshot(slices, small.columns), small);
});
test('codec rejects truncated records, duplicate IDs, nonfinite numbers and bad UTF-8', () => {
  const snapshot = importCsv(bytes('a\n1'), { delimiter: ',' }, randomUUID);
  const chunks = encodeSnapshot(snapshot);
  assert.throws(() => decodeSnapshot([chunks[0].slice(0, -1)], snapshot.columns));
  assert.throws(() => decodeSnapshot([Uint8Array.of(255)], snapshot.columns));
  snapshot.rows.push(snapshot.rows[0]);
  assert.throws(() => encodeSnapshot(snapshot));
  snapshot.rows.pop();
  snapshot.rows[0].cells[snapshot.columns[0].columnId].value = Infinity;
  assert.throws(() => encodeSnapshot(snapshot));
});
