import { DataError, type Column, type Snapshot } from './types.js';
import { sameCell } from './cell.js';
export interface IdMapping { columns: Record<string, string>; rows: Record<string, string> }
export function assertReplayCompatible(input: { expectedEngineVersion: string; serverEngineVersion: string; expectedCurrentVersionId: string; serverCurrentVersionId: string; sameAccount: boolean; resourceAvailable: boolean }): void {
  if (!input.sameAccount) throw new DataError('SYNC_ACCOUNT_MISMATCH', 'Tài khoản đồng bộ không khớp');
  if (!input.resourceAvailable) throw new DataError('SYNC_RESOURCE_UNAVAILABLE', 'Tài nguyên đã xóa hoặc mất quyền');
  if (!input.expectedEngineVersion || input.expectedEngineVersion !== input.serverEngineVersion) throw new DataError('SYNC_ENGINE_MISMATCH', 'Phiên bản engine khác; cần tính lại hoặc review');
  if (input.expectedCurrentVersionId !== input.serverCurrentVersionId) throw new DataError('BASE_VERSION_STALE', 'Server version đã thay đổi; giữ nguyên bản local');
}
/** Map only V1 from the same exact source and import options. Never map by names. */
export function mapOriginalIds(local: Snapshot, server: Snapshot, input: { localSourceHash: string; serverSourceHash: string; sameImportOptions: boolean }): IdMapping {
  const mismatch = (): never => { throw new DataError('SYNC_MAPPING_CONFLICT', 'Không thể xác minh ánh xạ V1'); };
  if (!/^[a-f0-9]{64}$/.test(input.localSourceHash) || input.localSourceHash !== input.serverSourceHash || !input.sameImportOptions || local.columns.length !== server.columns.length || local.rows.length !== server.rows.length) mismatch();
  const mapping: IdMapping = { columns: {}, rows: {} };
  const localColumns = new Set<string>(), serverColumns = new Set<string>(), localRows = new Set<string>(), serverRows = new Set<string>();
  local.columns.forEach((column, position) => {
    const other = server.columns[position];
    if (column.position !== position || other.position !== position || column.name !== other.name || column.logicalType !== other.logicalType || localColumns.has(column.columnId) || serverColumns.has(other.columnId)) mismatch();
    localColumns.add(column.columnId); serverColumns.add(other.columnId);
    mapping.columns[column.columnId] = other.columnId;
  });
  local.rows.forEach((row, position) => {
    const other = server.rows[position];
    if (row.position !== position || other.position !== position || localRows.has(row.rowId) || serverRows.has(other.rowId)) mismatch();
    localRows.add(row.rowId); serverRows.add(other.rowId);
    for (const column of local.columns) {
      const left = row.cells[column.columnId], right = other.cells[mapping.columns[column.columnId]];
      // Public row responses intentionally omit codec-only rawToken. Exact source
      // hash + options and typed/token equality verify the original lexemes.
      if (!left || !right || !sameCell(left, right)) mismatch();
    }
    mapping.rows[row.rowId] = other.rowId;
  });
  return mapping;
}
function categoryKey(column: Column): string | undefined {
  if (!column.lineage) return undefined;
  const category = column.lineage.category;
  return category === undefined ? 'ordinal' : 'isMissing' in category ? 'missing' : JSON.stringify([category.kind, category.value]);
}
export function mapEncodedColumns(local: Column[], server: Column[], sourceMapping: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();
  for (const column of local) {
    if (!column.lineage) continue;
    const source = sourceMapping[column.lineage.sourceColumnId], key = categoryKey(column);
    const matches = server.filter(other => other.lineage?.sourceColumnId === source && categoryKey(other) === key && other.logicalType === column.logicalType);
    if (!source || matches.length !== 1 || used.has(matches[0].columnId)) throw new DataError('SYNC_MAPPING_CONFLICT', 'Lineage/category không ánh xạ duy nhất');
    result[column.columnId] = matches[0].columnId; used.add(matches[0].columnId);
  }
  return result;
}
export function resumeAction(input: { applyUnconfirmed: boolean; previewExpired: boolean; operationConfirmed: boolean }): 'checkpoint' | 'replay-apply-same-key' | 'new-preview-attempt' | 'apply' {
  if (input.operationConfirmed) return 'checkpoint';
  if (input.applyUnconfirmed) return 'replay-apply-same-key';
  return input.previewExpired ? 'new-preview-attempt' : 'apply';
}
