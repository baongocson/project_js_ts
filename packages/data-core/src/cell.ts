import type { Cell } from './types.js';
export function missingKind(cell: Cell): 'null' | 'empty' | 'whitespace' | 'n_a' | undefined {
  if (cell.kind === 'null') return 'null';
  if (cell.kind !== 'text') return undefined;
  if (cell.value === '') return 'empty';
  if (cell.value.trim() === '') return 'whitespace';
  if (cell.value.trim() === 'N/A') return 'n_a';
  return undefined;
}
export function sameCell(left: Cell, right: Cell): boolean {
  return left.kind === right.kind && left.value === right.value;
}

/** Helpers shared by processing and backend DTO wrappers. */
import type { LogicalType } from './types.js';
export function cellKey(cell: Cell): string { return JSON.stringify([cell.kind, cell.value]); }
export function acceptsCell(type: LogicalType, cell: Cell): boolean {
  return missingKind(cell) !== undefined || type === 'mixed' || type === cell.kind;
}
export function outputCell(cell: Cell): Cell & { missingKind?: ReturnType<typeof missingKind> } {
  const missing = missingKind(cell);
  return missing ? { ...cell, missingKind: missing } : { ...cell };
}
