import { describe, test } from '@jest/globals';
import assert from 'node:assert/strict';
import type { Snapshot } from '@dashboard/data-core';
import { restoreSummary } from '../../../../modules/history/restore-summary';
const col = '00000000-0000-4000-8000-000000000001';
const row = '00000000-0000-4000-8000-000000000002';
const base: Snapshot = {
  columns: [{ columnId: col, position: 0, name: 'score', logicalType: 'number', format: null, lineage: null }],
  rows: [{ rowId: row, position: 0, cells: { [col]: { kind: 'number', value: 7, rawToken: '7' } } }],
};
describe('pure restore summary', () => {
  test('D21 counts schema changes separately while preserving common-cell changes',()=>{
    const extra='00000000-0000-4000-8000-000000000003';
    const added:Snapshot={columns:[...base.columns,{...base.columns[0],columnId:extra,position:1}],rows:base.rows.map(row=>({...row,cells:{...row.cells,[extra]:{kind:'number',value:1}}}))};
    for(const [before,after] of [[base,added],[added,base]]) {
      const summary=restoreSummary(before,after);
      assert.equal(summary.updatedCellCount,0);
      assert.equal(summary.updatedRowCount,1);
    }
  });
  test('computes a full-snapshot cell diff without mutating a version', () => {
    const next: Snapshot = { ...base, rows: [{ ...base.rows[0], cells: { [col]: { kind: 'number', value: 3, rawToken: '3' } } }] };
    const frozen = JSON.stringify(base);
    const result = restoreSummary(base, next);
    assert.equal(result.updatedCellCount, 1);
    assert.equal(result.updatedRowCount, 1);
    assert.deepEqual(result.before, { rowCount: 1, columnCount: 1 });
    assert.equal(JSON.stringify(base), frozen);
  });
  test('preserves raw CSV token changes and observes row deletions', () => {
    const next: Snapshot = { ...base, rows: [{ ...base.rows[0], cells: { [col]: { kind: 'number', value: 7, rawToken: '007' } } }] };
    assert.equal(restoreSummary(base, next).updatedCellCount, 1);
    assert.equal(restoreSummary(base, { ...base, rows: [] }).deletedRowCount, 1);
  });
  test('counts schema additions and type changes separately', () => {
    const next: Snapshot = { ...base, columns: [{ ...base.columns[0], logicalType: 'text' }, { ...base.columns[0], columnId: '00000000-0000-4000-8000-000000000003', position: 1 }] };
    const result = restoreSummary(base, next);
    assert.equal(result.addedColumnCount, 1);
    assert.equal(result.typeChangedColumnCount, 1);
  });
});
