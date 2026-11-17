import { describe, expect, it } from '@jest/globals';
import { normalizeWorkspace } from '../../../../modules/projects/workspace-normalization';
import { importCsv } from '@dashboard/data-core';
import { randomUUID } from 'node:crypto';
import type { WorkspaceStateDto } from '../../../../modules/projects/dto/workspace.dto';
describe('Workspace references against a published snapshot', () => {
  it('keeps valid references and UI settings, drops removed or nonnumeric axes and clamps only invalid pages', () => {
    const snapshot = importCsv(new TextEncoder().encode('a,b\n1,text\n2,other'), { delimiter: ',' }, randomUUID);
    const [number, text] = snapshot.columns, missing = randomUUID();
    const state: WorkspaceStateDto = { activeTab: 'outliers', chartConfig: { xColumnId: number.columnId, yColumnId: text.columnId, zColumnId: missing, outlierColumnIds: [number.columnId, missing], colorMode: 'outlier', outlierMethod: 'zscore', threshold: 3 }, selection: { columnIds: [text.columnId, missing], cell: { rowId: snapshot.rows[0].rowId, columnId: text.columnId } }, tableState: { page: 100, pageSize: 1, sort: null, filters: [] } };
    const { workspace, adjustments } = normalizeWorkspace(state, snapshot);
    expect(workspace.chartConfig).toMatchObject({ xColumnId: number.columnId, yColumnId: null, zColumnId: null, outlierMethod: 'zscore', threshold: 3 });
    expect(workspace.selection).toEqual({ columnIds: [text.columnId], cell: state.selection.cell });
    expect(workspace.tableState.page).toBe(2);
    expect(adjustments.map(item => item.code)).toEqual(expect.arrayContaining(['COLUMN_REMOVED', 'COLUMN_TYPE_CHANGED', 'PAGE_CLAMPED']));
    expect(state.chartConfig.yColumnId).toBe(text.columnId);
    expect(state.tableState.page).toBe(100);
  });
  it('reports a removed selected row and uses filtered row counts for page adjustment', () => {
    const snapshot = importCsv(new TextEncoder().encode('a\n1\n2'), { delimiter: ',' }, randomUUID), columnId = snapshot.columns[0].columnId;
    const state: WorkspaceStateDto = { activeTab: 'collection', chartConfig: { xColumnId: null, yColumnId: null, zColumnId: null, outlierColumnIds: [], colorMode: 'normal', outlierMethod: 'iqr', threshold: 1.5 }, selection: { columnIds: [], cell: { rowId: randomUUID(), columnId } }, tableState: { page: 2, pageSize: 1, sort: null, filters: [{ columnId, op: 'gt', value: { kind: 'number', value: 9 } }] } };
    const { workspace, adjustments } = normalizeWorkspace(state, snapshot);
    expect(workspace.selection.cell).toBeNull(); expect(workspace.tableState.page).toBe(1);
    expect(adjustments).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'ROW_REMOVED' })]));
  });
});
