const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { importCsv, mapOriginalIds, mapEncodedColumns, assertReplayCompatible, resumeAction } = require('../dist');
test('V1 mapping verifies positions and exact values with duplicate column names', () => {
  const source = new TextEncoder().encode('a,a\n001,true\nN/A,false');
  const local = importCsv(source, { delimiter: ',' }, randomUUID), server = importCsv(source, { delimiter: ',' }, randomUUID);
  const input = { localSourceHash: 'a'.repeat(64), serverSourceHash: 'a'.repeat(64), sameImportOptions: true };
  const map = mapOriginalIds(local, server, input);
  assert.equal(map.columns[local.columns[0].columnId], server.columns[0].columnId);
  assert.equal(map.rows[local.rows[1].rowId], server.rows[1].rowId);
  assert.throws(() => mapOriginalIds(local, server, { ...input, sameImportOptions: false }));
  server.rows[0].cells[server.columns[0].columnId].value = '1';
  assert.throws(() => mapOriginalIds(local, server, input));
});
test('encoding maps source + typed category rather than a column display name', () => {
  const column = (columnId, sourceColumnId, category) => ({ columnId, name: 'duplicate', position: 0, logicalType: 'number', format: null, lineage: { sourceColumnId, category } });
  const local = [column('l1', 'local', { kind: 'text', value: '1' }), column('l2', 'local', { kind: 'number', value: 1 })];
  const server = [column('s2', 'server', { kind: 'number', value: 1 }), column('s1', 'server', { kind: 'text', value: '1' })];
  assert.deepEqual(mapEncodedColumns(local, server, { local: 'server' }), { l1: 's1', l2: 's2' });
  assert.throws(() => mapEncodedColumns(local, [...server, server[0]], { local: 'server' }));
});
test('sync stops on engine/account/version conflict and verifies uncertain Apply first', () => {
  const base = { expectedEngineVersion: 'v1', serverEngineVersion: 'v1', expectedCurrentVersionId: 'a', serverCurrentVersionId: 'a', sameAccount: true, resourceAvailable: true };
  assert.doesNotThrow(() => assertReplayCompatible(base));
  for (const change of [{ serverEngineVersion: 'v2' }, { serverCurrentVersionId: 'b' }, { sameAccount: false }, { resourceAvailable: false }]) assert.throws(() => assertReplayCompatible({ ...base, ...change }));
  assert.equal(resumeAction({ applyUnconfirmed: true, previewExpired: true, operationConfirmed: false }), 'replay-apply-same-key');
  assert.equal(resumeAction({ applyUnconfirmed: false, previewExpired: true, operationConfirmed: false }), 'new-preview-attempt');
  assert.equal(resumeAction({ applyUnconfirmed: true, previewExpired: true, operationConfirmed: true }), 'checkpoint');
});
