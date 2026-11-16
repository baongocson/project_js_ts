import { test, describe } from '@jest/globals';
import type { CellInputDto } from '../../../../common/dto/cell.dto';
import assert from 'node:assert/strict';
import { InputValidator } from '../../../../common/validation/validation';
import { cellKey, outputCell, sameCell, acceptsCell } from '../../../../common/domain/cell-policy';

function cell(input: unknown) { const v = new InputValidator(); return v.finish(v.cell(input, 'cell')); }

describe('common/domain/cell-policy contracts (unit)', () => {
    test('missing tokens remain distinct, no Unicode/space/case normalization', () => {
        const cells: CellInputDto[] = [{ kind: 'null', value: null }, ...['', ' ', 'N/A', ' N/A '].map(value => ({ kind: 'text' as const, value }))];
        assert.equal(new Set(cells.map(cellKey)).size, 5);
        for (const input of cells) {
            assert.deepEqual(cell(input), input);
            assert.notEqual(outputCell(input).missingKind, undefined);
            assert.equal(outputCell(input).value, input.value);
            assert.equal(acceptsCell('number', input), true);
        }
        assert.equal(sameCell({ kind: 'text', value: 'é' }, { kind: 'text', value: 'e\u0301' }), false);
        assert.equal(sameCell({ kind: 'text', value: 'A' }, { kind: 'text', value: 'a' }), false);
        assert.equal(sameCell({ kind: 'text', value: ' a' }, { kind: 'text', value: 'a' }), false);
        assert.equal(sameCell({ kind: 'number', value: 1 }, { kind: 'text', value: '1' }), false);
        assert.equal(acceptsCell('number', { kind: 'text', value: 'abc' }), false);
    });
    test('typed-null input rejects output-only metadata and unsafe or invalid values', () => {
        for (const input of [{ kind: 'null' }, { kind: 'null', value: 0 }, { kind: 'null', value: null, missingKind: 'null' }, { kind: 'number', value: Infinity }, { kind: 'number', value: 9007199254740992 }, { kind: 'date', value: '2026-02-30' }, { kind: 'datetime', value: '2026-02-30T00:00:00.000Z' }])
            assert.throws(() => cell(input));
        assert.deepEqual(cell({ kind: 'date', value: '2024-02-29' }), { kind: 'date', value: '2024-02-29' });
        assert.throws(() => cell({ kind: 'text', value: String.fromCharCode(0xd800) }));
        assert.doesNotThrow(() => cell({ kind: 'text', value: '😀' }));
    });
});
