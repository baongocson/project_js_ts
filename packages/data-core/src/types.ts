export type LogicalType = 'number' | 'text' | 'date' | 'datetime' | 'boolean' | 'mixed';
export type Cell =
  | { kind: 'text'; value: string }
  | { kind: 'date' | 'datetime'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null'; value: null };
export type StoredCell = Cell & { rawToken?: string };
export interface Column {
  columnId: string;
  name: string;
  position: number;
  logicalType: LogicalType;
  format: { inputFormat?: string; timezone?: string; decimalSeparator?: '.' | ','; allowThousands?: boolean } | null;
  lineage: { sourceColumnId: string; category?: Cell | { isMissing: true } } | null;
}
export interface Row { rowId: string; position: number; cells: Record<string, StoredCell> }
export interface Snapshot { columns: Column[]; rows: Row[] }
export const CODEC_VERSION = 'typed-ndjson-v1';
export const LIMITS = Object.freeze({ csvBytes: 16_000_000, chunkBytes: 4 * 1024 * 1024, snapshotBytes: 100 * 1024 * 1024, columns: 1000 });
export class DataError extends Error {
  constructor(readonly code: string, message: string, readonly details: Record<string, unknown> = {}) { super(message); }
}
