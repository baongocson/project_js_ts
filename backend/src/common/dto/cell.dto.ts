import type { Cell } from '@dashboard/data-core';
export type { LogicalType } from '@dashboard/data-core';
export type CellInputDto = Cell;
export type MissingKind = 'null' | 'empty' | 'whitespace' | 'n_a';
export type CellOutputDto = CellInputDto & { missingKind?: MissingKind };
export interface ValidationIssueDto { path: string; code: string; message: string }
export interface DiagnosticDto { code: string; message: string; rowId?: string; columnId?: string; path?: string }
