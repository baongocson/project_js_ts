const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { importCsv, encodeSnapshot, parseCsv, queryRows, compareCells, LIMITS } = require('../dist');
const bytes = value => new TextEncoder().encode(value);
test('sort/filter preserve typed equality, Unicode order, stable positions and missing-last', () => {
  const snapshot = importCsv(bytes('a\n2\nN/A\n1\n2\n""'), { delimiter: ',' }, randomUUID);
  const id = snapshot.columns[0].columnId;
  snapshot.rows[0].rowId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
  snapshot.rows[3].rowId = '00000000-0000-4000-8000-000000000000';
  const sorted = queryRows(snapshot, [], { columnId: id, direction: 'desc' }).map(row => row.position);
  assert.deepEqual(sorted.slice(0, 3), [3, 0, 2]);
  assert.deepEqual(sorted.slice(3).sort(), [1, 4]);
  assert.deepEqual(queryRows(snapshot, [{ columnId: id, op: 'eq', value: { kind: 'number', value: 2 } }]).map(row => row.position), [0, 3]);
  assert.equal(queryRows(snapshot, [{ columnId: id, op: 'eq', value: { kind: 'text', value: '2' } }]).length, 0);
  assert.equal(compareCells({ kind: 'text', value: '😀' }, { kind: 'text', value: '\uffff' }), 1);
  assert.equal(compareCells({ kind: 'text', value: 'N/A' }, { kind: 'number', value: 2 }, 'desc'), 1);
});
test('CSV boundaries allow exact size and 1000 columns, reject excess and malformed UTF-8', () => {
  const exact = new Uint8Array(LIMITS.csvBytes).fill(97); exact[1] = 10;
  assert.equal(parseCsv(exact, ',').length, 2);
  assert.throws(() => parseCsv(new Uint8Array(LIMITS.csvBytes + 1), ','), error => error.code === 'FILE_TOO_LARGE');
  assert.equal(parseCsv(bytes(Array(1000).fill('a').join(',')), ',')[0].fields.length, 1000);
  assert.throws(() => parseCsv(bytes(Array(1001).fill('a').join(',')), ','));
  assert.throws(() => parseCsv(Uint8Array.of(0xff), ','));
});
test('codec enforces 100 MiB after encoding without adding a row or cell limit', () => {
  const snapshot = importCsv(bytes('a\nx'), { delimiter: ',' }, randomUUID);
  snapshot.rows[0].cells[snapshot.columns[0].columnId].value = 'x'.repeat(LIMITS.snapshotBytes);
  assert.throws(() => encodeSnapshot(snapshot), error => error.code === 'LIMIT_EXCEEDED');
});
test('codec validates schemas and cell kind while permitting missing tokens in numeric columns', () => {
  const snapshot = importCsv(bytes('a\n1\nN/A'), { delimiter: ',' }, randomUUID);
  assert.doesNotThrow(() => encodeSnapshot(snapshot));
  snapshot.rows[0].cells[snapshot.columns[0].columnId] = { kind: 'text', value: 'wrong kind' };
  assert.throws(() => encodeSnapshot(snapshot));
});
