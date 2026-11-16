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
