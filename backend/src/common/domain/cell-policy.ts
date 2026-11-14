import type { CellInputDto, CellOutputDto, LogicalType, MissingKind } from '../dto/cell.dto';
export function missingKind(cell: CellInputDto): MissingKind | undefined {
  if (cell.kind === 'null') return 'null';
  if (cell.kind !== 'text') return undefined;
  if (cell.value === '') return 'empty';
  if (cell.value.trim() === '') return 'whitespace';
  if (cell.value.trim() === 'N/A') return 'n_a';
  return undefined;
}
export function outputCell(cell: CellInputDto): CellOutputDto {
  const missing = missingKind(cell);
  return missing ? { ...cell, missingKind: missing } : { ...cell };
}
// No trim, case folding or Unicode normalization. A null and a text token remain different.
export function cellKey(cell: CellInputDto): string {
  return JSON.stringify([cell.kind, cell.value]);
}
export function sameCell(a: CellInputDto, b: CellInputDto): boolean { return cellKey(a) === cellKey(b); }
export function acceptsCell(type: LogicalType, cell: CellInputDto): boolean {
  return missingKind(cell) !== undefined || type === 'mixed' || type === cell.kind;
}
