const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { importCsv, processSnapshot, encodeSnapshot, decodeSnapshot, mapEncodedColumns, ENGINE_VERSION } = require('../dist');
const bytes = text => new TextEncoder().encode(text);
const sp = (method, scope, parameters = {}) => ({ method, scope, parameters, statisticsScope: { type: 'whole-columns' } });
const columns = (...ids) => ({ type: 'columns', columnIds: ids });
function roundtrip(snapshot) {
  const chunks = encodeSnapshot(snapshot);
  assert.ok(chunks.length > 0);
  assert.deepEqual(decodeSnapshot(chunks, snapshot.columns), snapshot);
}
test('BE-2 CSV snapshot feeds BE-3 process; typed output survives BE-2 codec', () => {
  const source = importCsv(bytes('value,tag\n1,cat\nN/A,dog\n3,cat\n'), { delimiter: ',' }, randomUUID);
  const id = source.columns[0].columnId;
  const result = processSnapshot(source, sp('fill_mean', columns(id)));
  assert.equal(result.canApply, true);
  assert.deepEqual(result.snapshot.rows.map(r => r.cells[id].value), [1, 2, 3]);
  assert.equal(source.rows[1].cells[id].value, 'N/A');
  assert.equal(result.snapshot.rows[0].cells[id].rawToken, '1');
  assert.equal(result.snapshot.rows[1].cells[id].rawToken, undefined);
  roundtrip(result.snapshot);
});
test('BE-3 text-to-number conversion preserves exact missing tokens and clears stale rawToken', () => {
  const source = importCsv(bytes('n\n123\nN/A\n456\n'), { delimiter: ',' }, randomUUID);
  const id = source.columns[0].columnId;
  assert.equal(source.columns[0].logicalType, 'number');
  // Convert to text then number; conversions preserve BE-2 metadata.
  const text = processSnapshot(source, sp('convert_text', columns(id), { format: 'canonical' }));
  assert.equal(text.canApply, true);
  roundtrip(text.snapshot);
  const number = processSnapshot(text.snapshot, sp('convert_number', columns(id), { decimalSeparator: '.', allowThousands: false }));
  assert.equal(number.snapshot.columns[0].logicalType, 'number');
  assert.equal(number.snapshot.rows[0].cells[id].value, 123);
  roundtrip(number.snapshot);
});
test('BE-3 remove_duplicates produces contiguous row positions for BE-2 codec', () => {
  const source = importCsv(bytes('tag\na\nb\na\nc\n'), { delimiter: ',' }, randomUUID);
  const result = processSnapshot(source, sp('remove_duplicates', { type: 'dataset' }, { keep: 'first' }));
  assert.equal(result.canApply, true);
  assert.deepEqual(result.snapshot.rows.map(r => r.position), [0,1,2]);
  assert.deepEqual(result.snapshot.rows.map(r => r.rowId), [source.rows[0].rowId, source.rows[1].rowId, source.rows[3].rowId]);
  roundtrip(result.snapshot);
});
test('BE-3 drop_missing_rows produces contiguous row positions and keeps IDs', () => {
  const source = importCsv(bytes('tag\na\nN/A\nb\n'), { delimiter: ',' }, randomUUID);
  const result = processSnapshot(source, sp('drop_missing_rows', { type: 'dataset' }, { condition: 'any' }));
  assert.deepEqual(result.snapshot.rows.map(r => r.position), [0,1]);
  assert.deepEqual(result.snapshot.rows.map(r => r.rowId), [source.rows[0].rowId, source.rows[2].rowId]);
  roundtrip(result.snapshot);
});
test('BE-3 drop_missing_columns preserves BE-2 column metadata and contiguous positions', () => {
  const source = importCsv(bytes('keep,remove,alsoKeep\na,N/A,3\nb,N/A,4\n'), { delimiter: ',' }, randomUUID);
  const result = processSnapshot(source, sp('drop_missing_columns', { type: 'dataset' }, { condition: 'all' }));
  assert.equal(result.canApply, true);
  assert.deepEqual(result.snapshot.columns.map(c => c.position), [0,1]);
  assert.deepEqual(result.snapshot.columns.map(c => c.name), ['keep', 'alsoKeep']);
  roundtrip(result.snapshot);
});
test('BE-3 refuses removing every column because BE-2 codec disallows empty schema', () => {
  const source = importCsv(bytes('a,b\nN/A,N/A\n'), { delimiter: ',' }, randomUUID);
  const result = processSnapshot(source, sp('drop_missing_columns', { type: 'dataset' }, { condition: 'all' }));
  assert.equal(result.canApply, false);
  assert.equal(result.errors[0].code, 'EMPTY_SCHEMA_NOT_ALLOWED');
  assert.equal(result.snapshot, source);
});
test('BE-3 one_hot produces valid BE-2 UUIDv4 metadata, lineage and codec roundtrip', () => {
  const source = importCsv(bytes('tag\ncat\ndog\nN/A\n'), { delimiter: ',' }, randomUUID);
  const originalId = source.columns[0].columnId;
  const result = processSnapshot(source, sp('one_hot', columns(originalId), { keepSource: false, missingCategory: true, asCategory: false }));
  assert.equal(result.canApply, true);
  assert.equal(result.snapshot.columns.length, 3);
  assert.deepEqual(result.snapshot.columns.map(c => c.position), [0,1,2]);
  for (const col of result.snapshot.columns) {
    assert.match(col.columnId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(col.lineage.sourceColumnId, originalId);
    assert.equal(col.format, null);
  }
  assert.ok(result.snapshot.columns.some(c => c.lineage.category.isMissing === true));
  const mapping = mapEncodedColumns(result.snapshot.columns, result.snapshot.columns, { [originalId]: originalId });
  assert.equal(Object.keys(mapping).length, 3);
  roundtrip(result.snapshot);
  const second = processSnapshot(source, sp('one_hot', columns(originalId), { keepSource: false, missingCategory: true, asCategory: false }));
  assert.deepEqual(result.snapshot, second.snapshot);
});
test('BE-3 ordinal keepSource true/false survives BE-2 storage and sync mapping', () => {
  const source = importCsv(bytes('tag\ndog\ncat\nN/A\n'), { delimiter: ',' }, randomUUID);
  const id = source.columns[0].columnId;
  const params = { mapping: [{ value: { kind: 'text', value: 'cat' }, label: 1 }, { value: { kind: 'text', value: 'dog' }, label: 2 }], keepSource: true };
  const keep = processSnapshot(source, sp('ordinal', columns(id), params));
  assert.equal(keep.canApply, true);
  assert.equal(keep.snapshot.columns.length, 2);
  assert.deepEqual(keep.snapshot.columns.map(c => c.position), [0,1]);
  assert.equal(keep.snapshot.columns[1].lineage.sourceColumnId, id);
  roundtrip(keep.snapshot);
  const replaced = processSnapshot(source, sp('ordinal', columns(id), { ...params, keepSource: false }));
  assert.equal(replaced.canApply, true);
  assert.equal(replaced.snapshot.columns.length, 1);
  assert.equal(replaced.snapshot.columns[0].lineage.sourceColumnId, id);
  roundtrip(replaced.snapshot);
});
test('BE-3 no-op cannot create a new published version', () => {
  const source = importCsv(bytes('tag\ncat\n'), { delimiter: ',' }, randomUUID);
  const id = source.columns[0].columnId;
  const result = processSnapshot(source, sp('uppercase', columns(id)));
  assert.equal(result.canApply, true);
  const noChange = processSnapshot(result.snapshot, sp('uppercase', columns(id)));
  assert.equal(noChange.canApply, false);
  assert.equal(noChange.snapshot, result.snapshot);
  assert.match(ENGINE_VERSION, /unified/);
});
