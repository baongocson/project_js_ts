import { DataError, LIMITS, type Cell, type LogicalType, type Snapshot, type StoredCell } from './types.js';
import { missingKind } from './cell.js';
export interface CsvOptions {
  delimiter: ',' | ';' | '\t';
  columnTypes?: { position: number; logicalType: LogicalType }[];
}
interface CsvRecord { fields: string[]; lineStart: number; lineEnd: number; index: number }
function csvError(code: string, index: number, lineStart: number, lineEnd: number, columnPosition?: number): never {
  throw new DataError('CSV_INVALID', 'CSV không hợp lệ', { issues: [{ code, recordIndex: index, lineStart, lineEnd, ...(columnPosition === undefined ? {} : { columnPosition }), message: 'Kiểm tra cấu trúc hoặc kiểu dữ liệu CSV tại vị trí này' }] });
}
/** Strict CSV records, preserving field contents and physical source locations. */
export function parseCsv(bytes: Uint8Array, delimiter: CsvOptions['delimiter']): CsvRecord[] {
  if (bytes.byteLength > LIMITS.csvBytes) throw new DataError('FILE_TOO_LARGE', 'CSV vượt 16.000.000 byte');
  if (![',', ';', '\t'].includes(delimiter)) throw new DataError('VALIDATION_ERROR', 'Delimiter không hợp lệ');
  let source: string;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { csvError('CSV_ENCODING_INVALID', 1, 1, 1); }
  if (!source.length) csvError('CSV_EMPTY', 1, 1, 1);
  const records: CsvRecord[] = [];
  let fields: string[] = [], field = '', state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  let line = 1, lineStart = 1, touched = false;
  const finish = () => {
    if (!touched && !fields.length && field === '') csvError('CSV_BLANK_RECORD', records.length + 1, lineStart, line);
    fields.push(field);
    records.push({ fields, lineStart, lineEnd: line, index: records.length + 1 });
    fields = []; field = ''; state = 'start'; touched = false;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const newline = char === '\n' || char === '\r';
    if (state === 'quoted') {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else state = 'closed';
      } else {
        field += char;
        if (newline) {
          if (char === '\r' && source[i + 1] === '\n') { field += '\n'; i++; }
          line++;
        }
      }
      continue;
    }
    if (newline) {
      finish();
      if (char === '\r' && source[i + 1] === '\n') i++;
      line++; lineStart = line;
    } else if (char === delimiter) {
      fields.push(field); field = ''; state = 'start'; touched = true;
    } else if (char === '"' && state === 'start') { state = 'quoted'; touched = true; }
    else {
      if (char === '"' || state === 'closed') csvError('CSV_QUOTE_INVALID', records.length + 1, lineStart, line, fields.length);
      field += char; state = 'plain'; touched = true;
    }
  }
  if (state === 'quoted') csvError('CSV_QUOTE_UNCLOSED', records.length + 1, lineStart, line, fields.length);
  if (touched || fields.length || field.length) finish();
  const count = records[0].fields.length;
  if (count > LIMITS.columns) throw new DataError('LIMIT_EXCEEDED', 'CSV vượt 1.000 cột');
  for (const row of records) if (row.fields.length !== count) csvError('CSV_FIELD_COUNT_MISMATCH', row.index, row.lineStart, row.lineEnd);
  return records;
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function numberCell(token: string, conservative: boolean): Cell | undefined {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) return undefined;
  if (conservative && /^[+-]?0\d/.test(token)) return undefined;
  const value = Number(token);
  if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) return undefined;
  return { kind: 'number', value };
}
function typedCell(token: string, type: LogicalType, conservative = false): Cell | undefined {
  if (type === 'text') return { kind: 'text', value: token };
  if (type === 'number') return numberCell(token, conservative);
  if (type === 'boolean') {
    const value = conservative ? token : token.toLowerCase();
    if (value === 'true' || (!conservative && value === '1')) return { kind: 'boolean', value: true };
    if (value === 'false' || (!conservative && value === '0')) return { kind: 'boolean', value: false };
    return undefined;
  }
  if (type === 'date') return validDate(token) ? { kind: 'date', value: token } : undefined;
  if (type === 'datetime') {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(token);
    if (!match || !validDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return undefined;
    if (match[5] && match[5] !== 'Z' && (Number(match[5].slice(1, 3)) > 23 || Number(match[5].slice(4)) > 59)) return undefined;
    const date = new Date(token + (match[5] ? '' : 'Z'));
    return Number.isFinite(date.getTime()) ? { kind: 'datetime', value: date.toISOString() } : undefined;
  }
  for (const candidate of ['number', 'boolean', 'date', 'datetime'] as const) {
    const value = typedCell(token, candidate, true);
    if (value) return value;
  }
  return { kind: 'text', value: token };
}
/** ID generation is supplied by the host; the core has no Node/browser storage dependency. */
export function importCsv(bytes: Uint8Array, options: CsvOptions, newId: () => string): Snapshot {
  const [header, ...records] = parseCsv(bytes, options.delimiter);
  const overrides = new Map<number, LogicalType>();
  for (const override of options.columnTypes ?? []) {
    if (!Number.isInteger(override.position) || override.position < 0 || override.position >= header.fields.length || overrides.has(override.position) || !['number', 'text', 'date', 'datetime', 'boolean', 'mixed'].includes(override.logicalType)) throw new DataError('VALIDATION_ERROR', 'columnTypes không hợp lệ');
    overrides.set(override.position, override.logicalType);
  }
  const columns = header.fields.map((name, position) => {
    const values = records.map(row => row.fields[position]).filter(value => !missingKind({ kind: 'text', value }));
    let logicalType = overrides.get(position);
    if (!logicalType) logicalType = values.length ? (['number', 'boolean', 'date', 'datetime'] as const).find(type => values.every(value => typedCell(value, type, true) !== undefined)) ?? 'text' : 'text';
    return { columnId: newId(), name, position, logicalType, format: null, lineage: null };
  });
  const rows = records.map((record, position) => {
    const cells: Record<string, StoredCell> = {};
    for (const column of columns) {
      const token = record.fields[column.position];
      const value = missingKind({ kind: 'text', value: token }) ? { kind: 'text' as const, value: token } : typedCell(token, column.logicalType);
      if (!value) csvError('CSV_TYPE_MISMATCH', record.index, record.lineStart, record.lineEnd, column.position);
      cells[column.columnId] = value.kind === 'text' ? value : { ...value, rawToken: token };
    }
    return { rowId: newId(), position, cells };
  });
  return { columns, rows };
}
