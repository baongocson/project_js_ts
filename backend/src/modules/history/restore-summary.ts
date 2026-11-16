import { sameCell, type Snapshot } from '@dashboard/data-core';
import type { ProcessingSummaryDto } from '../../common/dto/response.dto';

/** Summary from immutable, complete snapshots; no statistics are estimated from UI pages. */
export function restoreSummary(before: Snapshot, after: Snapshot): ProcessingSummaryDto {
  const beforeColumns = new Map(before.columns.map(column => [column.columnId, column]));
  const afterColumns = new Map(after.columns.map(column => [column.columnId, column]));
  const oldRows = new Map(before.rows.map(row => [row.rowId, row]));
  const newRows = new Map(after.rows.map(row => [row.rowId, row]));
  let insertedRowCount = 0, deletedRowCount = 0, updatedRowCount = 0, updatedCellCount = 0;
  for (const row of before.rows) {
    const next = newRows.get(row.rowId);
    if (!next) { deletedRowCount++; continue; }
    const ids = new Set([...Object.keys(row.cells), ...Object.keys(next.cells)]);
    let count = 0;
    let rowChanged = row.position !== next.position;
    for (const id of ids) {
      const left = row.cells[id], right = next.cells[id];
      if (!left || !right) { rowChanged = true; continue; }
      if (!sameCell(left, right) || left.rawToken !== right.rawToken) { count++; rowChanged = true; }
    }
    if (rowChanged) { updatedRowCount++; updatedCellCount += count; }
  }
  for (const row of after.rows) if (!oldRows.has(row.rowId)) insertedRowCount++;
  let typeChangedColumnCount = 0, metadataChangedColumnCount = 0;
  for (const column of after.columns) {
    const previous = beforeColumns.get(column.columnId);
    if (!previous) continue;
    if (previous.logicalType !== column.logicalType) typeChangedColumnCount++;
    else if (JSON.stringify(previous) !== JSON.stringify(column)) metadataChangedColumnCount++;
  }
  return {
    before: { rowCount: before.rows.length, columnCount: before.columns.length },
    after: { rowCount: after.rows.length, columnCount: after.columns.length },
    insertedRowCount, deletedRowCount, updatedRowCount, updatedCellCount,
    addedColumnCount: after.columns.filter(column => !beforeColumns.has(column.columnId)).length,
    removedColumnCount: before.columns.filter(column => !afterColumns.has(column.columnId)).length,
    typeChangedColumnCount, metadataChangedColumnCount, usedStatistics: [],
  };
}
