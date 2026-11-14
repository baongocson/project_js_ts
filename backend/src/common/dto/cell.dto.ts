export type LogicalType = 'number' | 'text' | 'date' | 'datetime' | 'boolean' | 'mixed';
export type CellInputDto =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'date' | 'datetime'; value: string }
  | { kind: 'null'; value: null };
export type MissingKind = 'null' | 'empty' | 'whitespace' | 'n_a';
export type CellOutputDto = CellInputDto & { missingKind?: MissingKind };
export interface ValidationIssueDto { path: string; code: string; message: string }
export interface DiagnosticDto { code: string; message: string; rowId?: string; columnId?: string; path?: string }
