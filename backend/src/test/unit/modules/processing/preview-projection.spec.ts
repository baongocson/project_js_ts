import { describe, test } from '@jest/globals';
import assert from 'node:assert/strict';
import { projectPreview } from '../../../../modules/processing/preview-projection';
import type { Snapshot } from '@dashboard/data-core';
import type { ProcessingSpecificationDto } from '../../../../modules/processing/dto/processing.dto';
const colA = '00000000-0000-4000-8000-000000000001';
const colB = '00000000-0000-4000-8000-000000000002';
const rowA = '00000000-0000-4000-8000-000000000003';
const rowB = '00000000-0000-4000-8000-000000000004';
const column = (columnId: string, position: number) => ({columnId,name:columnId,position,logicalType:'number' as const,format:null,lineage:null});
const spec: ProcessingSpecificationDto = { method:'fill_mean',parameters:{},scope:{type:'columns',columnIds:[colA]},statisticsScope:{type:'whole-columns'}};
const base:Snapshot = { columns:[column(colA,0)], rows:[
  {rowId:rowA,position:0,cells:{[colA]:{kind:'number',value:2}}},
  {rowId:rowB,position:1,cells:{[colA]:{kind:'null',value:null}}},
]};
describe('processing preview projection',()=>{
  test('D21 separates added/removed columns from updated cells on populated rows',()=>{
    const added:Snapshot={columns:[...base.columns,column(colB,1)],rows:base.rows.map(row=>({...row,cells:{...row.cells,[colB]:{kind:'number',value:9}}}))};
    for(const [before,after] of [[base,added],[added,base]]) {
      const result=projectPreview(before,after,spec);
      assert.equal(result.summary.updatedCellCount,0);
      assert.equal(result.summary.updatedRowCount,2);
      assert.equal(result.changes.length,2);
      assert.equal(result.summary.addedColumnCount+result.summary.removedColumnCount,1);
    }
  });
  test('one changed cell and statistics from whole base column',()=>{
    const next:Snapshot = {columns:base.columns,rows:[base.rows[0],{...base.rows[1],cells:{[colA]:{kind:'number',value:2}}}]};
    const result=projectPreview(base,next,spec);
    assert.equal(result.summary.updatedRowCount,1);
    assert.equal(result.summary.updatedCellCount,1);
    assert.equal(result.summary.usedStatistics[0].validCount,1);
    assert.equal(result.summary.usedStatistics[0].missingCount,1);
    assert.equal(result.summary.usedStatistics[0].mean,2);
    assert.deepEqual(result.changes.map(c=>c.rowId),[rowB]);
    assert.equal(base.rows[1].cells[colA].kind,'null');
  });
  test('deleted row and shifted row are indexed with stable positions',()=>{
    const next:Snapshot={columns:base.columns,rows:[{...base.rows[1],position:0}]};
    const result=projectPreview(base,next,spec);
    assert.equal(result.summary.deletedRowCount,1);
    assert.equal(result.summary.updatedRowCount,1);
    assert.deepEqual(result.changes.map(c=>c.changeKind),['deleted','updated']);
    assert.deepEqual(result.changes.map(c=>c.ordinal),[0,1]);
  });
  test('schema only updates tracked even without row data',()=>{
    const empty:Snapshot={columns:[column(colA,0)],rows:[]};
    const changed:Snapshot={columns:[column(colA,0),column(colB,1)],rows:[]};
    const result=projectPreview(empty,changed,spec);
    assert.equal(result.summary.addedColumnCount,1);
    assert.equal(result.changes.length,0);
    assert.equal(result.schemaChanges.added[0].columnId,colB);
  });
});
