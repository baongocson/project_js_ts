import type { Cell, Row, Snapshot } from './types.js';
import { missingKind, sameCell } from './cell.js';
export type RowFilter = { columnId: string; op: 'isMissing' | 'isNotMissing' } | { columnId: string; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains'; value: Cell };
export function compareCells(a: Cell, b: Cell, direction: 'asc' | 'desc' = 'asc'): number {
  const am = missingKind(a) !== undefined, bm = missingKind(b) !== undefined;
  if (am || bm) return am === bm ? 0 : am ? 1 : -1;
  const ranks = { number: 0, date: 1, datetime: 2, boolean: 3, text: 4, null: 5 };
  let result = 0;
  if (a.kind !== b.kind) result = Math.sign(ranks[a.kind] - ranks[b.kind]);
  else if (a.kind === 'text' && b.kind === 'text') {
    const left = Array.from(a.value), right = Array.from(b.value);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      result = Math.sign(left[i].codePointAt(0)! - right[i].codePointAt(0)!);
      if (result) break;
    }
    if (!result) result = Math.sign(left.length - right.length);
  } else if (a.value !== b.value) result = a.value! < b.value! ? -1 : 1;
  return direction === 'asc' ? result : -result;
}
export function matchesCellFilter(cell: Cell, filter: RowFilter): boolean {
  if (filter.op === 'isMissing') return missingKind(cell) !== undefined;
  if (filter.op === 'isNotMissing') return missingKind(cell) === undefined;
  if (!('value' in filter)) return false;
  if (filter.op === 'eq') return sameCell(cell, filter.value);
  if (filter.op === 'ne') return !sameCell(cell, filter.value);
  if (missingKind(cell) !== undefined || missingKind(filter.value) !== undefined) return false;
  if (filter.op === 'contains') return cell.kind === 'text' && filter.value.kind === 'text' && cell.value.toLowerCase().includes(filter.value.value.toLowerCase());
  if (cell.kind !== filter.value.kind || !['number', 'date', 'datetime'].includes(cell.kind)) return false;
  const order = compareCells(cell, filter.value);
  return filter.op === 'lt' ? order < 0 : filter.op === 'lte' ? order <= 0 : filter.op === 'gt' ? order > 0 : order >= 0;
}
export function queryRows(snapshot: Snapshot, filters: RowFilter[], sort?: { columnId: string; direction: 'asc' | 'desc' }): Row[] {
  const rows = snapshot.rows.filter(row => filters.every(filter => matchesCellFilter(row.cells[filter.columnId], filter)));
  if (sort) rows.sort((a, b) => compareCells(a.cells[sort.columnId], b.cells[sort.columnId], sort.direction) || (a.rowId < b.rowId ? -1 : a.rowId > b.rowId ? 1 : 0));
  return rows;
}
