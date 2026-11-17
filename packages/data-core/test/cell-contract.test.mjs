import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  acceptsCell, cellKey, compareCells, matchesCellFilter, missingKind,
  outputCell, sameCell,
} from '../dist/esm/index.js';
const require = createRequire(import.meta.url);
const cjs = require('../dist/index.js');
const col = '00000000-0000-4000-8000-000000000001';

test('shared ESM and CJS exports agree on all typed missing categories', () => {
  const cells = [
    { kind: 'null', value: null }, { kind: 'text', value: '' },
    { kind: 'text', value: ' ' }, { kind: 'text', value: 'N/A' },
    { kind: 'text', value: ' N/A ' },
  ];
  assert.equal(new Set(cells.map(cellKey)).size, 5);
  for (const cell of cells) {
    assert.equal(cjs.missingKind(cell), missingKind(cell));
    assert.deepEqual(cjs.outputCell(cell), outputCell(cell));
    assert.equal(acceptsCell('number', cell), true);
  }
});
test('equality preserves Unicode, case, whitespace and kind', () => {
  for (const [a, b] of [
    [{ kind: 'text', value: 'é' }, { kind: 'text', value: 'e\u0301' }],
    [{ kind: 'text', value: 'A' }, { kind: 'text', value: 'a' }],
    [{ kind: 'text', value: ' a' }, { kind: 'text', value: 'a' }],
    [{ kind: 'number', value: 1 }, { kind: 'text', value: '1' }],
  ]) {
    assert.equal(sameCell(a, b), false);
    assert.equal(cjs.sameCell(a, b), false);
  }
});
test('comparison sorts missing last both directions and preserves ordering', () => {
  const missing = { kind: 'text', value: 'N/A' }, n = { kind: 'number', value: 1 };
  for (const direction of ['asc', 'desc']) {
    assert.equal(compareCells(missing, n, direction), 1);
    assert.equal(cjs.compareCells(missing, n, direction), 1);
  }
  assert.equal(compareCells(n, { kind: 'text', value: '0' }), -1);
  assert.equal(compareCells({ kind: 'boolean', value: false }, { kind: 'boolean', value: true }), -1);
});
test('filter equality is typed and contains remains case insensitive', () => {
  const contains = { columnId: col, op: 'contains', value: { kind: 'text', value: 'PH' } };
  const equals = { columnId: col, op: 'eq', value: { kind: 'text', value: '1' } };
  assert.equal(matchesCellFilter({ kind: 'text', value: 'Alpha' }, contains), true);
  assert.equal(cjs.matchesCellFilter({ kind: 'text', value: 'Alpha' }, contains), true);
  assert.equal(matchesCellFilter({ kind: 'number', value: 1 }, equals), false);
  assert.equal(matchesCellFilter({ kind: 'text', value: 'N/A' }, { columnId: col, op: 'isMissing' }), true);
});
