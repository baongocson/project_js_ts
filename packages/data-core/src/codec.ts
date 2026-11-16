import { CODEC_VERSION, DataError, LIMITS, type Column, type Row, type Snapshot, type StoredCell } from './types.js';
import { missingKind } from './cell.js';
const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function invalid(): never { throw new DataError('SNAPSHOT_INVALID', 'Snapshot không hợp lệ'); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function cell(value: unknown): StoredCell {
  const item = record(value);
  if (Object.keys(item).some(key => !['kind', 'value', 'rawToken'].includes(key))) invalid();
  if (item.rawToken !== undefined && typeof item.rawToken !== 'string') invalid();
  switch (item.kind) {
    case 'text': if (typeof item.value !== 'string') invalid(); break;
    case 'date': {
      if (typeof item.value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.value)) invalid();
      const date = new Date(item.value + 'T00:00:00.000Z');
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.value) invalid();
      break;
    }
    case 'datetime': {
      if (typeof item.value !== 'string') invalid();
      const date = new Date(item.value);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== item.value) invalid();
      break;
    }
    case 'number': if (typeof item.value !== 'number' || !Number.isFinite(item.value)) invalid(); break;
    case 'boolean': if (typeof item.value !== 'boolean') invalid(); break;
    case 'null': if (item.value !== null) invalid(); break;
    default: invalid();
  }
  return item as unknown as StoredCell;
}
function validateColumns(columns: Column[]): void {
  if (!Array.isArray(columns) || columns.length < 1 || columns.length > LIMITS.columns) invalid();
  const ids = new Set<string>();
  columns.forEach((column, position) => {
    record(column);
    if (Object.keys(column).some(key => !['columnId', 'name', 'position', 'logicalType', 'format', 'lineage'].includes(key))) invalid();
    if (!uuid.test(column.columnId) || ids.has(column.columnId) || column.position !== position || typeof column.name !== 'string' || !['number', 'text', 'date', 'datetime', 'boolean', 'mixed'].includes(column.logicalType)) invalid();
    if (column.format !== null) {
      const format = record(column.format);
      if (Object.keys(format).some(key => !['inputFormat', 'timezone', 'decimalSeparator', 'allowThousands'].includes(key))) invalid();
      if (format.inputFormat !== undefined && typeof format.inputFormat !== 'string') invalid();
      if (format.timezone !== undefined && typeof format.timezone !== 'string') invalid();
      if (format.decimalSeparator !== undefined && !['.', ','].includes(String(format.decimalSeparator))) invalid();
      if (format.allowThousands !== undefined && typeof format.allowThousands !== 'boolean') invalid();
    }
    if (column.lineage !== null) {
      const lineage = record(column.lineage);
      if (Object.keys(lineage).some(key => !['sourceColumnId', 'category'].includes(key)) || typeof lineage.sourceColumnId !== 'string' || !uuid.test(lineage.sourceColumnId)) invalid();
      if (lineage.category !== undefined) {
        const category = record(lineage.category);
        if (category.isMissing === true) { if (Object.keys(category).length !== 1) invalid(); }
        else cell(category);
      }
    }
    ids.add(column.columnId);
  });
}
function validateRow(value: unknown, columns: Column[], position: number, seen: Set<string>): Row {
  const item = record(value);
  if (Object.keys(item).some(key => !['rowId', 'position', 'cells'].includes(key))) invalid();
  if (typeof item.rowId !== 'string' || !uuid.test(item.rowId) || seen.has(item.rowId) || item.position !== position) invalid();
  const cells = record(item.cells);
  if (Object.keys(cells).length !== columns.length) invalid();
  for (const column of columns) {
    const value = cell(cells[column.columnId]);
    if (missingKind(value) === undefined && column.logicalType !== 'mixed' && value.kind !== column.logicalType) invalid();
  }
  seen.add(item.rowId);
  return item as unknown as Row;
}
/** Chunks are arbitrary byte slices; even a UTF-8 code point may span chunks. */
export function encodeSnapshot(snapshot: Snapshot): Uint8Array[] {
  validateColumns(snapshot.columns);
  const chunks: Uint8Array[] = [];
  let buffer = new Uint8Array(LIMITS.chunkBytes), used = 0, total = 0;
  const append = (value: unknown) => {
    const bytes = encoder.encode(JSON.stringify(value) + '\n');
    total += bytes.length;
    if (total > LIMITS.snapshotBytes) throw new DataError('LIMIT_EXCEEDED', 'Snapshot vượt 100 MiB');
    for (let offset = 0; offset < bytes.length;) {
      const size = Math.min(bytes.length - offset, buffer.length - used);
      buffer.set(bytes.subarray(offset, offset + size), used); used += size; offset += size;
      if (used === buffer.length) { chunks.push(buffer); buffer = new Uint8Array(LIMITS.chunkBytes); used = 0; }
    }
  };
  append({ codecVersion: CODEC_VERSION });
  const seen = new Set<string>();
  snapshot.rows.forEach((row, position) => append(validateRow(row, snapshot.columns, position, seen)));
  if (used) chunks.push(buffer.slice(0, used));
  return chunks;
}
/** Schema is persisted separately in versionColumns and participates in content hashing. */
export function decodeSnapshot(chunks: Iterable<Uint8Array>, columns: Column[]): Snapshot {
  validateColumns(columns);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const rows: Row[] = [], seen = new Set<string>();
  let pending = '', total = 0, header = false;
  const consume = (text: string) => {
    pending += text;
    let newline: number;
    while ((newline = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
      let value: unknown;
      try { value = JSON.parse(line); } catch { invalid(); }
      if (!header) {
        const metadata = record(value);
        if (Object.keys(metadata).length !== 1 || metadata.codecVersion !== CODEC_VERSION) invalid();
        header = true;
      } else rows.push(validateRow(value, columns, rows.length, seen));
    }
  };
  try {
    for (const chunk of chunks) {
      total += chunk.byteLength;
      if (!chunk.byteLength || chunk.byteLength > LIMITS.chunkBytes || total > LIMITS.snapshotBytes) invalid();
      consume(decoder.decode(chunk, { stream: true }));
    }
    consume(decoder.decode());
  } catch (error) {
    if (error instanceof DataError) throw error;
    invalid();
  }
  if (!header || pending !== '') invalid();
  return { columns, rows };
}
