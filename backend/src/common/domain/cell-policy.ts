import type { CellInputDto, CellOutputDto, LogicalType } from '../dto/cell.dto';
import { missingKind } from '@dashboard/data-core';
export { missingKind, sameCell } from '@dashboard/data-core';
export function outputCell(cell: CellInputDto): CellOutputDto {
  const missing = missingKind(cell);
  return missing ? { ...cell, missingKind: missing } : { ...cell };
}
// No trim, case folding or Unicode normalization. A null and a text token remain different.
export function cellKey(cell: CellInputDto): string {
  return JSON.stringify([cell.kind, cell.value]);
}
export function acceptsCell(type: LogicalType, cell: CellInputDto): boolean {
  return missingKind(cell) !== undefined || type === 'mixed' || type === cell.kind;
}
