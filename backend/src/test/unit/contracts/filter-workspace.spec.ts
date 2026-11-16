import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parsePatchWorkspace } from '../../../modules/projects/dto/workspace.validation';
import { parseRowsQuery } from '../../../modules/datasets/dto/dataset-query.validation';
import { parsePoints3dQuery } from '../../../modules/analysis/dto/analysis-query.validation';

const col = '00000000-0000-4000-8000-000000000001', id = '0123456789abcdef01234567';

describe('contracts/filter-workspace contracts (unit)', () => {
    test('query filters and autosave filters share operator rules and keep typed values intact', () => {
        const filters = [{ columnId: col, op: 'contains', value: { kind: 'text', value: ' A ' } }];
        assert.deepEqual(parseRowsQuery({ filters: JSON.stringify(filters) }).filters, filters);
        assert.deepEqual(parsePatchWorkspace({ revision: 4, boundVersionId: id, tableState: { filters } }).tableState?.filters, filters);
        for (const op of ['lt', 'lte', 'gt', 'gte']) {
            const bad = [{ columnId: col, op, value: { kind: 'text', value: '1' } }];
            assert.throws(() => parseRowsQuery({ filters: JSON.stringify(bad) }));
            assert.throws(() => parsePatchWorkspace({ revision: 4, boundVersionId: id, tableState: { filters: bad } }));
        }
        assert.throws(() => parseRowsQuery({ filters: '{' }));
        assert.throws(() => parseRowsQuery({ sort: col + ':asc:extra' }));
        assert.equal(parsePoints3dQuery({ xColumnId: col, yColumnId: col, zColumnId: col }).maxPoints, 10000);
        assert.throws(() => parsePoints3dQuery({ xColumnId: col, yColumnId: col, zColumnId: col, maxPoints: '10001' }));
    });
});
