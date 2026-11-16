import { test, describe } from '@jest/globals';
import type { CellInputDto } from '../../../../common/dto/cell.dto';
import assert from 'node:assert/strict';
import { compareCells, matchesCellFilter } from '../../../../common/domain/cell-comparison';

const col = '00000000-0000-4000-8000-000000000001';

describe('common/domain/cell-comparison contracts (unit)', () => {
    test('missing sorts last in either direction; Unicode equality stays exact while contains is insensitive', () => {
        const missing: CellInputDto = { kind: 'text', value: 'N/A' }, number: CellInputDto = { kind: 'number', value: 1 };
        assert.equal(compareCells(missing, number, 'asc'), 1);
        assert.equal(compareCells(missing, number, 'desc'), 1);
        assert.equal(compareCells(number, { kind: 'text', value: '0' }), -1);
        assert.equal(compareCells({ kind: 'boolean', value: false }, { kind: 'boolean', value: true }), -1);
        assert.equal(matchesCellFilter({ kind: 'text', value: 'Alpha' }, { columnId: col, op: 'contains', value: { kind: 'text', value: 'PH' } }), true);
        assert.equal(matchesCellFilter({ kind: 'text', value: 'é' }, { columnId: col, op: 'contains', value: { kind: 'text', value: 'e\u0301' } }), false);
        assert.equal(matchesCellFilter(number, { columnId: col, op: 'eq', value: { kind: 'text', value: '1' } }), false);
        assert.equal(matchesCellFilter(missing, { columnId: col, op: 'isMissing' }), true);
    });
});
