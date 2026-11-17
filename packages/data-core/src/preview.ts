/** Shared pure projection: API and local Preview use identical counters/statistics. */
import { cellKey,missingKind,sameCell } from './cell.js';
import { compareCells } from './query.js';
import type { Cell,Column,Snapshot } from './types.js';
import type { ProcessingSpecification } from './processing.js';
export interface ProcessingSummary {
  before:{rowCount:number;columnCount:number};after:{rowCount:number;columnCount:number};
  insertedRowCount:number;deletedRowCount:number;updatedRowCount:number;updatedCellCount:number;
  addedColumnCount:number;removedColumnCount:number;typeChangedColumnCount:number;metadataChangedColumnCount:number;
  usedStatistics:{columnId:string;validCount:number;missingCount:number;mean?:number;median?:number;mode?:Cell;min?:number;max?:number;std?:number;q1?:number;q3?:number;lower?:number;upper?:number}[];
}
export interface SchemaChanges {added:Column[];removed:Column[];modified:{columnId:string;before:Column;after:Column}[]}
export type RowChange = { rowId: string; ordinal: number; changeKind: 'updated' | 'deleted' | 'inserted'; beforePosition: number | null; afterPosition: number | null };

function identical<T>(a: T, b: T): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function distinctColumns(before: Column[], after: Column[]): SchemaChanges {
  const left = new Map(before.map(c => [c.columnId, c]));
  const right = new Map(after.map(c => [c.columnId, c]));
  return {
    added: after.filter(c => !left.has(c.columnId)),
    removed: before.filter(c => !right.has(c.columnId)),
    modified: after.filter(c => left.has(c.columnId) && !identical(left.get(c.columnId), c)).map(c => ({ columnId: c.columnId, before: left.get(c.columnId)!, after: c })),
  };
}
function quantile(sorted: number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const floor = Math.floor(position), ceil = Math.ceil(position);
  return sorted[floor] + (sorted[ceil] - sorted[floor]) * (position - floor);
}
function statistics(snapshot: Snapshot, specification: ProcessingSpecification): ProcessingSummary['usedStatistics'] {
  const methods = new Set(['fill_mean', 'fill_median', 'fill_mode', 'fill_max', 'clip_iqr', 'clip_zscore', 'scale_minmax', 'standardize']);
  if (!methods.has(specification.method)) return [];
  const scope = specification.scope;
  const ids = scope.type === 'dataset' ? snapshot.columns.map(c => c.columnId) : scope.type === 'columns' ? scope.columnIds : [scope.columnId];
  return ids.map(columnId => {
    const cells = snapshot.rows.map(r => r.cells[columnId]).filter((c): c is Cell => c !== undefined);
    const missingCount = cells.filter(c => missingKind(c) !== undefined).length;
    const valid = cells.filter(c => missingKind(c) === undefined);
    const output: ProcessingSummary['usedStatistics'][number] = { columnId, validCount: valid.length, missingCount };
    if (specification.method === 'fill_mode' && valid.length) {
      const ordered = [...valid].sort(compareCells);
      const frequencies = new Map<string, number>();
      for (const item of valid) frequencies.set(cellKey(item), (frequencies.get(cellKey(item)) ?? 0) + 1);
      let winner = ordered[0], maxCount = 0;
      for (const candidate of ordered) {
        const count = frequencies.get(cellKey(candidate)) ?? 0;
        if (count > maxCount) { maxCount = count; winner = candidate; }
      }
      output.mode = { kind: winner.kind, value: winner.value } as Cell;
      return output;
    }
    const numbers = valid.filter((cell): cell is { kind: 'number'; value: number } => cell.kind === 'number').map(c => c.value);
    if (numbers.length !== valid.length || !numbers.length) return output;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + (n - mean) ** 2, 0) / numbers.length;
    const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75);
    const extra = { mean, median: quantile(sorted, 0.5), min: sorted[0], max: sorted.at(-1)!, std: Math.sqrt(variance), q1, q3 };
    for (const [key, value] of Object.entries(extra)) if (Number.isFinite(value)) Object.assign(output, { [key]: value });
    if (specification.method === 'clip_iqr') {
      const factor = specification.parameters.factor;
      const lower = q1 - factor * (q3 - q1), upper = q3 + factor * (q3 - q1);
      if (Number.isFinite(lower)) output.lower = lower;
      if (Number.isFinite(upper)) output.upper = upper;
    }
    return output;
  });
}
export function projectPreview(base: Snapshot, next: Snapshot, specification: ProcessingSpecification): { summary: ProcessingSummary; schemaChanges: SchemaChanges; changes: RowChange[] } {
  const schemaChanges = distinctColumns(base.columns, next.columns);
  const beforeRows = new Map(base.rows.map(r => [r.rowId, r]));
  const afterRows = new Map(next.rows.map(r => [r.rowId, r]));
  let insertedRowCount = 0, deletedRowCount = 0, updatedRowCount = 0, updatedCellCount = 0;
  const changes: RowChange[] = [];
  const append = (rowId: string, kind: RowChange['changeKind'], beforePosition: number | null, afterPosition: number | null) => changes.push({ rowId, ordinal: changes.length, changeKind: kind, beforePosition, afterPosition });
  for (const before of base.rows) {
    const after = afterRows.get(before.rowId);
    if (!after) { deletedRowCount++; append(before.rowId, 'deleted', before.position, null); continue; }
    const ids = new Set([...Object.keys(before.cells), ...Object.keys(after.cells)]);
    let cellChangeCount = 0;
    let rowChanged = before.position !== after.position;
    for (const id of ids) {
      const a = before.cells[id], b = after.cells[id];
      if (!a || !b) { rowChanged = true; continue; }
      if (!sameCell(a, b) || a.rawToken !== b.rawToken) { cellChangeCount++; rowChanged = true; }
    }
    if (rowChanged) {
      updatedRowCount++;
      updatedCellCount += cellChangeCount;
      append(before.rowId, 'updated', before.position, after.position);
    }
  }
  for (const after of next.rows) if (!beforeRows.has(after.rowId)) { insertedRowCount++; append(after.rowId, 'inserted', null, after.position); }
  const summary: ProcessingSummary = {
    before: { rowCount: base.rows.length, columnCount: base.columns.length },
    after: { rowCount: next.rows.length, columnCount: next.columns.length },
    insertedRowCount, deletedRowCount, updatedRowCount, updatedCellCount,
    addedColumnCount: schemaChanges.added.length, removedColumnCount: schemaChanges.removed.length,
    typeChangedColumnCount: schemaChanges.modified.filter(c => c.before.logicalType !== c.after.logicalType).length,
    metadataChangedColumnCount: schemaChanges.modified.filter(c => c.before.logicalType === c.after.logicalType).length,
    usedStatistics: statistics(base, specification),
  };
  return { summary, schemaChanges, changes };
}
