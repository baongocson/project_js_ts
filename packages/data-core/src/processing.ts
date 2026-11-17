/** Pure processor over BE-2 canonical Snapshot. No HTTP, storage, or browser dependencies. */
import { acceptsCell, missingKind, sameCell, cellKey } from './cell.js';
import type { Cell, LogicalType, Snapshot, Row } from './types.js';
import { processAdvanced } from './processing-advanced.js';
export type { Snapshot, Column, Row } from './types.js';
export type Scope = { type: 'cell'; rowId: string; columnId: string } | { type: 'columns'; columnIds: string[] } | { type: 'dataset' };
type StatsScope = { type: 'whole-columns' };
export type MethodParams = {
  edit_cell: { value: Cell };
  remove_duplicates: { keep: 'first' };
  strip_html: { decodeEntities: boolean };
  normalize_whitespace: { mode: 'trim' | 'collapse' | 'remove' };
  uppercase: Record<string, never>;
  lowercase: Record<string, never>;
  replace_value: { from: Cell; to: Cell; match: 'exact' };
  convert_number: { decimalSeparator: '.' | ','; allowThousands: boolean };
  convert_text: { format: 'canonical' };
  convert_date: { inputFormat: 'YYYY-MM-DD' };
  convert_datetime: { inputFormat: 'ISO8601'; timezone: string };
  convert_boolean: { trueValues: string[]; falseValues: string[]; caseSensitive: boolean };
  fill_constant: { value: Cell };
  fill_mean: Record<string, never>;
  fill_median: Record<string, never>;
  fill_mode: { tieBreak: 'typed-ascending' };
  fill_max: Record<string, never>;
  drop_missing_rows: { condition: 'any' | 'all' };
  drop_missing_columns: { condition: 'any' | 'all' };
  clip_iqr: { factor: number };
  clip_zscore: { threshold: number };
  scale_minmax: { rangeMin: number; rangeMax: number };
  standardize: Record<string, never>;
  log1p: Record<string, never>;
  square: Record<string, never>;
  tfidf: { lowercase: boolean; minDf: number; maxFeatures: number; norm: 'l2' | 'none'; sublinearTf: boolean; keepSource: boolean };
  one_hot: { keepSource: boolean; missingCategory: boolean; asCategory: boolean };
  ordinal: { mapping: { value: Cell; label: number }[]; keepSource: boolean };
};
export type ProcessingMethod = keyof MethodParams;
export type ProcessingSpecification = { [M in ProcessingMethod]: { method: M; scope: Scope; parameters: MethodParams[M]; statisticsScope: StatsScope } }[ProcessingMethod];
export type StarterSpecification = ProcessingSpecification;
export interface Diagnostic { code: string; message: string; rowId?: string; columnId?: string }
export interface ChangedCell { rowId: string; columnId: string; before: Cell; after: Cell }
export interface SchemaChange { columnId: string; before: LogicalType; after: LogicalType }
export interface EngineResult { snapshot: Snapshot; changes: ChangedCell[]; schemaChanges: SchemaChange[]; errors: Diagnostic[]; warnings: Diagnostic[]; canApply: boolean }
export const ENGINE_VERSION = 'data-core-unified-0.7.0';
/** 0.7 adds TF-IDF; the original 27 method semantics are unchanged. Unknown engines remain blocked. */
export function compatibleEngine(left:string,right:string,method?:string):boolean {
  return left===right || method!=='tfidf' && [left,right].every(value=>value==='data-core-unified-0.6.0'||value===ENGINE_VERSION);
}

function invalid(snapshot: Snapshot, errors: Diagnostic[]): EngineResult {
  return { snapshot, changes: [], schemaChanges: [], errors, warnings: [], canApply: false };
}
function ready(snapshot: Snapshot, rows: Row[], changes: ChangedCell[], schemaChanges: SchemaChange[] = []): EngineResult {
  const changed = changes.length > 0 || rows.length !== snapshot.rows.length || schemaChanges.length > 0;
  const columns = schemaChanges.length ? snapshot.columns.map(c => { const change = schemaChanges.find(s => s.columnId === c.columnId); return change ? { ...c, logicalType: change.after } : c; }) : snapshot.columns;
  return { snapshot: changed ? { columns, rows: rows.map((row, position) => row.position === position ? row : { ...row, position }) } : snapshot, changes, schemaChanges, errors: [],
    warnings: changed ? [] : [{ code: 'NO_CHANGES_DETECTED', message: 'Không có thay đổi' }], canApply: changed };
}
function isLeap(year: number): boolean { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const days = [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
function validTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(value);
  return !!match && Number(match[1]) < 24 && Number(match[2]) < 60 && Number(match[3]) < 60;
}
/** Resolve a wall-clock timestamp in an IANA zone without silently choosing a DST fold/gap. */
function zonedInstant(local: string, timezone: string): { iso?: string; error?: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.exec(local);
  if (!match || !validDate(match[1]) || !validTime(match[2])) return { error: 'INVALID_DATETIME' };
  const nominal = Date.parse(`${local}Z`);
  if (!Number.isFinite(nominal)) return { error: 'INVALID_DATETIME' };
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-GB-u-ca-gregory', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch { return { error: 'INVALID_TIMEZONE' }; }
  const parts = (instant: number) => {
    const result = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    return { date: `${result.year.padStart(4, '0')}-${result.month}-${result.day}`,
      time: `${result.hour}:${result.minute}:${result.second}` };
  };
  const offsets = new Set<number>();
  for (const reference of [nominal - 86_400_000, nominal, nominal + 86_400_000]) {
    const localParts = parts(reference);
    const localEpoch = Date.parse(`${localParts.date}T${localParts.time}Z`);
    if (Number.isFinite(localEpoch)) offsets.add(localEpoch - Math.floor(reference / 1000) * 1000);
  }
  const matches = new Set<number>();
  for (const offset of offsets) {
    const candidate = nominal - offset;
    const localParts = parts(candidate);
    if (localParts.date === match[1] && localParts.time === match[2].slice(0, 8)) matches.add(candidate);
  }
  if (matches.size === 0) return { error: 'DATETIME_NONEXISTENT' };
  if (matches.size > 1) return { error: 'DATETIME_AMBIGUOUS' };
  return { iso: new Date([...matches][0]).toISOString() };
}
function toIsoDatetime(value: string, timezone: string): { iso?: string; error?: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(Z|[+-]\d{2}:\d{2})?$/i.exec(value);
  if (!match || !validDate(match[1]) || !validTime(match[2])) return { error: 'INVALID_DATETIME' };
  if (match[3]) {
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? { iso: new Date(instant).toISOString() } : { error: 'INVALID_DATETIME' };
  }
  return zonedInstant(value, timezone);
}
function parseNumber(value: string, decimal: '.' | ',', allowThousands: boolean): { number?: number; error?: string } {
  const input = value.trim();
  const thousands = decimal === '.' ? ',' : '.';
  const fraction = decimal === '.' ? '\\.' : ',';
  const group = thousands === '.' ? '\\.' : ',';
  const exponent = '(?:[eE][+-]?\\d+)?';
  const plain = new RegExp(`^[+-]?(?:\\d+(?:${fraction}\\d+)?|${fraction}\\d+)${exponent}$`);
  const grouped = new RegExp(`^[+-]?\\d{1,3}(?:${group}\\d{3})+(?:${fraction}\\d+)?${exponent}$`);
  if (!plain.test(input) && !(allowThousands && grouped.test(input))) return { error: 'INVALID_NUMBER' };
  const normal = input.replaceAll(thousands, '').replace(decimal, '.');
  const number = Number(normal);
  if (!Number.isFinite(number)) return { error: 'INVALID_NUMBER' };
  if (Number.isInteger(number) && !Number.isSafeInteger(number)) return { error: 'NUMERIC_PRECISION_LOSS' };
  return { number };
}
function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  return value.replace(/&(#(?:\d+|x[0-9a-fA-F]+)|amp|lt|gt|quot|apos|nbsp);/g, (match, token: string) => {
    if (!token.startsWith('#')) return named[token] ?? match;
    const hex = token[1]?.toLowerCase() === 'x';
    const code = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}
function convert(before: Cell, spec: ProcessingSpecification): { after?: Cell; error?: string; logicalType?: LogicalType } {
  if (missingKind(before) !== undefined) return { after: before };
  switch (spec.method) {
    case 'edit_cell': return { after: spec.parameters.value };
    case 'fill_constant': return { after: before };
    case 'normalize_whitespace': {
      if (before.kind !== 'text') return { after: before };
      const mode = spec.parameters.mode;
      return { after: { kind: 'text', value: mode === 'trim' ? before.value.trim() : mode === 'collapse' ? before.value.replace(/\s+/gu, ' ').trim() : before.value.replace(/\s+/gu, '') } };
    }
    case 'strip_html': {
      if (before.kind !== 'text') return { after: before };
      const withoutExecutable = before.value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
      const plain = withoutExecutable.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '');
      return { after: { kind: 'text', value: spec.parameters.decodeEntities ? decodeEntities(plain) : plain } };
    }
    case 'uppercase': return before.kind === 'text' ? { after: { kind: 'text', value: before.value.toUpperCase() } } : { after: before };
    case 'lowercase': return before.kind === 'text' ? { after: { kind: 'text', value: before.value.toLowerCase() } } : { after: before };
    case 'replace_value': return { after: sameCell(before, spec.parameters.from) ? spec.parameters.to : before };
    case 'convert_number': {
      if (before.kind === 'number') return { after: before, logicalType: 'number' };
      if (before.kind !== 'text') return { error: 'INVALID_NUMBER' };
      const parsed = parseNumber(before.value, spec.parameters.decimalSeparator, spec.parameters.allowThousands);
      return parsed.number === undefined ? { error: parsed.error ?? 'INVALID_NUMBER' } : { after: { kind: 'number', value: parsed.number }, logicalType: 'number' };
    }
    case 'convert_text': {
      const value = before.kind === 'date' || before.kind === 'datetime' || before.kind === 'text' ? before.value : String(before.value);
      return { after: { kind: 'text', value }, logicalType: 'text' };
    }
    case 'convert_date': {
      if (before.kind === 'date' && validDate(before.value)) return { after: before, logicalType: 'date' };
      if (before.kind === 'datetime') {
        const iso = toIsoDatetime(before.value, 'UTC').iso;
        return iso ? { after: { kind: 'date', value: iso.slice(0, 10) }, logicalType: 'date' } : { error: 'INVALID_DATE' };
      }
      return before.kind === 'text' && validDate(before.value) ? { after: { kind: 'date', value: before.value }, logicalType: 'date' } : { error: 'INVALID_DATE' };
    }
    case 'convert_datetime': {
      const raw = before.kind === 'date' ? `${before.value}T00:00:00` : before.kind === 'text' || before.kind === 'datetime' ? before.value : undefined;
      if (raw === undefined) return { error: 'INVALID_DATETIME' };
      const parsed = toIsoDatetime(raw, spec.parameters.timezone);
      return parsed.iso === undefined ? { error: parsed.error ?? 'INVALID_DATETIME' } : { after: { kind: 'datetime', value: parsed.iso }, logicalType: 'datetime' };
    }
    case 'convert_boolean': {
      if (before.kind === 'boolean') return { after: before, logicalType: 'boolean' };
      if (before.kind !== 'text') return { error: 'INVALID_BOOLEAN' };
      const normalize = (v: string) => spec.parameters.caseSensitive ? v : v.toLowerCase();
      const value = normalize(before.value);
      if (spec.parameters.trueValues.some(v => normalize(v) === value)) return { after: { kind: 'boolean', value: true }, logicalType: 'boolean' };
      if (spec.parameters.falseValues.some(v => normalize(v) === value)) return { after: { kind: 'boolean', value: false }, logicalType: 'boolean' };
      return { error: 'INVALID_BOOLEAN' };
    }
    case 'remove_duplicates': return { after: before };
    default: return { error: 'UNSUPPORTED_METHOD' };
  }
}
const advancedMethods = new Set<ProcessingMethod>(['fill_mean','fill_median','fill_mode','fill_max','drop_missing_rows','drop_missing_columns','clip_iqr','clip_zscore','scale_minmax','standardize','log1p','square','one_hot','ordinal','tfidf']);
const conversions = new Set<ProcessingMethod>(['convert_number', 'convert_text', 'convert_date', 'convert_datetime', 'convert_boolean']);
const textMethods = new Set<ProcessingMethod>(['strip_html', 'normalize_whitespace', 'uppercase', 'lowercase']);
export function processSnapshot(snapshot: Snapshot, spec: ProcessingSpecification): EngineResult {
  if (advancedMethods.has(spec.method)) return processAdvanced(snapshot, spec);
  const errors: Diagnostic[] = [];
  const changes: ChangedCell[] = [];
  const columns = new Map(snapshot.columns.map(c => [c.columnId, c]));
  const rowIds = new Set(snapshot.rows.map(r => r.rowId));
  const scope = spec.scope;
  if (scope.type === 'cell') {
    if (!rowIds.has(scope.rowId)) errors.push({ code: 'ROW_NOT_FOUND', message: 'Dòng không tồn tại', rowId: scope.rowId });
    if (!columns.has(scope.columnId)) errors.push({ code: 'COLUMN_NOT_FOUND', message: 'Cột không tồn tại', columnId: scope.columnId });
  }
  if (scope.type === 'columns') for (const id of scope.columnIds) if (!columns.has(id)) errors.push({ code: 'COLUMN_NOT_FOUND', message: 'Cột không tồn tại', columnId: id });
  const selected = new Set(scope.type === 'cell' ? [scope.columnId] : scope.type === 'columns' ? scope.columnIds : snapshot.columns.map(c => c.columnId));
  if (spec.method === 'edit_cell' && scope.type !== 'cell') errors.push({ code: 'INVALID_SCOPE', message: 'edit_cell yêu cầu scope cell' });
  if (spec.method === 'remove_duplicates' && scope.type !== 'dataset') errors.push({ code: 'INVALID_SCOPE', message: 'remove_duplicates yêu cầu scope dataset' });
  if (conversions.has(spec.method) && scope.type === 'cell') errors.push({ code: 'INVALID_SCOPE', message: 'Chuyển đổi kiểu chỉ hỗ trợ scope columns/dataset' });
  if (errors.length) return invalid(snapshot, errors);
  if (spec.method === 'remove_duplicates') {
    const seen = new Set<string>();
    const rows = snapshot.rows.filter(row => {
      const key = JSON.stringify(snapshot.columns.map(column => cellKey(row.cells[column.columnId] ?? { kind: 'null', value: null })));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return ready(snapshot, rows, []);
  }
  const schemaChanges: SchemaChange[] = [];
  if (conversions.has(spec.method)) {
    const target: LogicalType = spec.method === 'convert_number' ? 'number' : spec.method === 'convert_text' ? 'text' : spec.method === 'convert_date' ? 'date' : spec.method === 'convert_datetime' ? 'datetime' : 'boolean';
    for (const columnId of selected) {
      const col = columns.get(columnId);
      if (col && col.logicalType !== target) schemaChanges.push({ columnId, before: col.logicalType, after: target });
    }
  }
  const rows = snapshot.rows.map(row => {
    if (scope.type === 'cell' && row.rowId !== scope.rowId) return row;
    let cells: Record<string, Cell> | undefined;
    for (const columnId of selected) {
      const column = columns.get(columnId);
      if (!column) continue;
      const before = row.cells[columnId];
      if (!before) { errors.push({ code: 'CELL_NOT_FOUND', message: 'Ô không tồn tại', rowId: row.rowId, columnId }); continue; }
      let after: Cell = before;
      if (spec.method === 'fill_constant') {
        if (missingKind(before) !== undefined) after = spec.parameters.value;
      } else if (spec.method === 'edit_cell') {
        after = spec.parameters.value;
      } else if (spec.method === 'replace_value') {
        if (sameCell(before, spec.parameters.from)) after = spec.parameters.to;
      } else if (textMethods.has(spec.method) && before.kind !== 'text') {
        continue;
      } else {
        const converted = convert(before, spec);
        if (converted.error) { errors.push({ code: converted.error, message: `Không thể xử lý ${spec.method}`, rowId: row.rowId, columnId }); continue; }
        after = converted.after ?? before;
      }
      if (sameCell(before, after)) continue;
      if (!acceptsCell(conversions.has(spec.method) ? (schemaChanges.find(c => c.columnId === columnId)?.after ?? column.logicalType) : column.logicalType, after)) { errors.push({ code: 'CELL_TYPE_MISMATCH', message: 'Giá trị không phù hợp kiểu cột', rowId: row.rowId, columnId }); continue; }
      if (!cells) cells = { ...row.cells };
      cells[columnId] = { ...after };
      changes.push({ rowId: row.rowId, columnId, before: { ...before }, after: { ...after } });
    }
    return cells ? { ...row, cells } : row;
  });
  return errors.length ? invalid(snapshot, errors) : ready(snapshot, rows, changes, schemaChanges);
}
