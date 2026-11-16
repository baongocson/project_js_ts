import { test, describe } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { StoredWorkspace } from '../../../../modules/projects/workspace-policy';
import assert from 'node:assert/strict';
import { parsePatchWorkspace } from '../../../../modules/projects/dto/workspace.validation';
import { planWorkspacePatch } from '../../../../modules/projects/workspace-policy';

const col = '00000000-0000-4000-8000-000000000001', row = '00000000-0000-4000-8000-000000000002', id = '0123456789abcdef01234567';
const base = (): StoredWorkspace => ({ revision: 4, boundVersionId: id, activeTab: 'collection', chartConfig: { xColumnId: null, yColumnId: null, zColumnId: null, colorMode: 'normal', outlierColumnIds: [], outlierMethod: 'iqr', threshold: 1.5 }, selection: { columnIds: [], cell: null }, tableState: { filters: [], sort: null, page: 1, pageSize: 10 } });
function code(error: unknown): unknown { assert.ok(error instanceof HttpException); const body = error.getResponse(); assert.ok(typeof body === 'object' && body !== null && 'code' in body); return body.code; }

describe('modules/projects/workspace contracts (unit)', () => {
    test('autosave identical succeeds, stale identical conflicts, actual change increments once', () => {
        const current = base();
        const same = parsePatchWorkspace({ revision: 4, boundVersionId: id, chartConfig: { colorMode: 'normal' } });
        const result = planWorkspacePatch(current, same, id);
        assert.equal(result.changed, false);
        assert.equal(result.workspace, current);
        assert.equal(current.revision, 4);
        assert.throws(() => planWorkspacePatch(current, { ...same, revision: 3 }, id), e => code(e) === 'WORKSPACE_REVISION_CONFLICT');
        assert.throws(() => planWorkspacePatch(current, same, 'f'.repeat(24)), e => code(e) === 'BASE_VERSION_STALE');
        const changed = planWorkspacePatch(current, parsePatchWorkspace({ revision: 4, boundVersionId: id, selection: { cell: { rowId: row, columnId: col } } }), id);
        assert.equal(changed.changed, true);
        assert.equal(changed.workspace.revision, 5);
        assert.deepEqual(changed.workspace.chartConfig, current.chartConfig);
        assert.equal(current.selection.cell, null);
    });
    test('nested null and empty patch restrictions do not reject valid clear operations', () => {
        for (const input of [{ revision: 4, boundVersionId: id }, { revision: 4, boundVersionId: id, chartConfig: {} }, { revision: 4, boundVersionId: id, chartConfig: null }, { revision: 4, boundVersionId: id, selection: { columnIds: null } }, { revision: 4, boundVersionId: id, tableState: { sort: { direction: 'asc' } } }, { revision: 4, boundVersionId: id, tableState: { pageSize: '10' } }])
            assert.throws(() => parsePatchWorkspace(input));
        assert.doesNotThrow(() => parsePatchWorkspace({ revision: 4, boundVersionId: id, selection: { cell: null, columnIds: [] }, tableState: { sort: null } }));
        assert.doesNotThrow(() => parsePatchWorkspace({ revision: 1, boundVersionId: null, chartConfig: { xColumnId: null } }));
    });
});
