import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parseCreatePreview } from '../../../modules/processing/dto/processing.validation';
import { parseRestoreVersion } from '../../../modules/history/dto/history.validation';
import { resourceParams, parseIdempotencyKey } from '../../../common/validation/request.validation';

const col = '00000000-0000-4000-8000-000000000001', row = '00000000-0000-4000-8000-000000000002', id = '0123456789abcdef01234567';
const request = (method: string, parameters: Record<string, unknown> = {}, scope: Record<string, unknown> = { type: 'cell', rowId: row, columnId: col }) => ({ baseVersionId: id, specification: { method, parameters, scope } });

describe('contracts/resource-id contracts (unit)', () => {
    test('resource ID normalization never lowercases user data or changes selection order', () => {
        const upper = 'ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF';
        const parsed = parseCreatePreview(request('edit_cell', { value: { kind: 'text', value: upper } }, { type: 'cell', rowId: upper, columnId: upper }));
        assert.ok(parsed.specification.method === 'edit_cell' && parsed.specification.scope.type === 'cell');
        assert.equal(parsed.specification.scope.rowId, upper.toLowerCase());
        assert.equal(parsed.specification.parameters.value.value, upper);
        assert.deepEqual(resourceParams(['projectId'])({ projectId: id.toUpperCase() }), { projectId: id });
        assert.equal(parseRestoreVersion({ expectedCurrentVersionId: id.toUpperCase() }).expectedCurrentVersionId, id);
        assert.equal(parseIdempotencyKey(' key '), ' key ');
        assert.throws(() => parseIdempotencyKey('   '));
    });
});
