import { queryRows, type Snapshot } from '@dashboard/data-core';
import type { WorkspaceStateDto } from './dto/workspace.dto';
import type { WorkspaceAdjustmentDto } from './dto/project-response.dto';
export function normalizeWorkspace<T extends WorkspaceStateDto>(state: T, snapshot: Snapshot | null): { workspace: T; adjustments: WorkspaceAdjustmentDto[] } {
  const workspace: T = { ...state, chartConfig: { ...state.chartConfig, outlierColumnIds: [...state.chartConfig.outlierColumnIds] }, selection: { ...state.selection, columnIds: [...state.selection.columnIds], cell: state.selection.cell ? { ...state.selection.cell } : null }, tableState: { ...state.tableState, filters: [...state.tableState.filters], sort: state.tableState.sort ? { ...state.tableState.sort } : null } };
  const adjustments: WorkspaceAdjustmentDto[] = [];
  const columns = new Map(snapshot?.columns.map(column => [column.columnId, column]) ?? []);
  const drop = (path: string, code: WorkspaceAdjustmentDto['code']) => adjustments.push({ path, code, reason: 'Tham chiếu không còn hợp lệ trong phiên bản hiện tại' });
  for (const key of ['xColumnId', 'yColumnId', 'zColumnId'] as const) {
    const id = workspace.chartConfig[key];
    if (id && (!columns.has(id) || columns.get(id)!.logicalType !== 'number')) {
      drop(`chartConfig.${key}`, columns.has(id) ? 'COLUMN_TYPE_CHANGED' : 'COLUMN_REMOVED');
      workspace.chartConfig[key] = null;
    }
  }
  workspace.chartConfig.outlierColumnIds = workspace.chartConfig.outlierColumnIds.filter(id => {
    if (columns.get(id)?.logicalType === 'number') return true;
    drop('chartConfig.outlierColumnIds', columns.has(id) ? 'COLUMN_TYPE_CHANGED' : 'COLUMN_REMOVED'); return false;
  });
  workspace.selection.columnIds = workspace.selection.columnIds.filter(id => { if (columns.has(id)) return true; drop('selection.columnIds', 'COLUMN_REMOVED'); return false; });
  const cell = workspace.selection.cell;
  if (cell && (!columns.has(cell.columnId) || !snapshot?.rows.some(row => row.rowId === cell.rowId))) {
    drop('selection.cell', !columns.has(cell.columnId) ? 'COLUMN_REMOVED' : 'ROW_REMOVED'); workspace.selection.cell = null;
  }
  workspace.tableState.filters = workspace.tableState.filters.filter(filter => {
    if (columns.has(filter.columnId)) return true;
    drop('tableState.filters', 'COLUMN_REMOVED'); return false;
  });
  if (workspace.tableState.sort && !columns.has(workspace.tableState.sort.columnId)) { drop('tableState.sort', 'COLUMN_REMOVED'); workspace.tableState.sort = null; }
  const count = snapshot ? queryRows(snapshot, workspace.tableState.filters).length : 0;
  const maxPage = Math.max(1, Math.ceil(count / workspace.tableState.pageSize));
  if (workspace.tableState.page > maxPage) { workspace.tableState.page = maxPage; drop('tableState.page', 'PAGE_CLAMPED'); }
  return { workspace, adjustments };
}
