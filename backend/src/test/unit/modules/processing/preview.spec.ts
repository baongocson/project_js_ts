import { test, describe } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { parseCreatePreview, parseApplyPreview } from '../../../../modules/processing/dto/processing.validation';
import { previewOutcome, assertPreviewApplicable, STATISTICS_ERROR_CODES } from '../../../../modules/processing/preview-policy';
import { buildDiagnostics } from '../../../../modules/processing/preview-policy';

const col = '00000000-0000-4000-8000-000000000001', row = '00000000-0000-4000-8000-000000000002', id = '0123456789abcdef01234567';
const request = (method: string, parameters: Record<string, unknown> = {}, scope: Record<string, unknown> = { type: 'cell', rowId: row, columnId: col }) => ({ baseVersionId: id, specification: { method, parameters, scope } });
function code(error: unknown): unknown { assert.ok(error instanceof HttpException); const body = error.getResponse(); assert.ok(typeof body === 'object' && body !== null && 'code' in body); return body.code; }

describe('modules/processing/preview contracts (unit)', () => {
    test('preview validation defaults safely; no hidden pipeline or scope fields', () => {
        const preview = parseCreatePreview(request('edit_cell', { value: { kind: 'null', value: null } }));
        assert.equal(preview.specification.statisticsScope.type, 'whole-columns');
        for (const specification of [{ method: 'edit_cell', parameters: { value: { kind: 'null', value: null } }, scope: { type: 'cell', rowId: row, columnId: col }, engineVersion: 'client' }, { method: 'edit_cell', parameters: { value: { kind: 'null', value: null } }, scope: { type: 'cell', rowId: row, columnId: col, filters: [] } }, { method: 'edit_cell', parameters: { value: { kind: 'null', value: null }, extra: true }, scope: { type: 'cell', rowId: row, columnId: col } }, { method: 'edit_cell', parameters: { value: { kind: 'null', value: null, missingKind: 'null' } }, scope: { type: 'cell', rowId: row, columnId: col } }])
            assert.throws(() => parseCreatePreview({ baseVersionId: id, specification }));
        assert.throws(() => parseCreatePreview(request('__proto__')));
        assert.throws(() => parseCreatePreview(request('scale_minmax', { rangeMin: 1, rangeMax: 0 })));
        assert.throws(() => parseCreatePreview(request('ordinal', { mapping: [{ value: { kind: 'text', value: 'a' }, label: 0 }, { value: { kind: 'text', value: 'a' }, label: 1 }] }, { type: 'columns', columnIds: [col] })));
        assert.throws(() => parseApplyPreview({ previewId: id, parameters: {} }));
    });
    test('no-op is ready but Apply is blocked; IQR/std diagnostics stay different', () => {
        const noop = previewOutcome(false);
        assert.equal(noop.status, 'ready');
        assert.equal(noop.canApply, false);
        assert.equal(noop.diagnostics.warnings[0].code, 'NO_CHANGES_DETECTED');
        assert.throws(() => assertPreviewApplicable(noop), e => e instanceof HttpException && e.getStatus() === 409 && code(e) === 'NO_CHANGES_TO_APPLY');
        assert.doesNotThrow(() => assertPreviewApplicable(previewOutcome(true)));
        const invalid = previewOutcome(false, [{ code: 'DOMAIN_ERROR', message: 'Giá trị không hợp lệ' }]);
        assert.equal(invalid.status, 'invalid');
        assert.equal(invalid.canApply, false);
        assert.notEqual(STATISTICS_ERROR_CODES.zeroIqr, STATISTICS_ERROR_CODES.zeroStd);
    });
    test('number/date/time and encoding parameters are validated without AI-picked limits', () => {
        const cols = { type: 'columns', columnIds: [col] };
        const numeric = parseCreatePreview(request('convert_number', { decimalSeparator: ',', allowThousands: true }, cols)).specification;
        assert.ok(numeric.method === 'convert_number');
        assert.equal(numeric.parameters.decimalSeparator, ',');
        assert.throws(() => parseCreatePreview(request('convert_date', { inputFormat: 'DD/MM/YYYY' }, cols)));
        assert.throws(() => parseCreatePreview(request('convert_datetime', { timezone: 'Invalid/Zone' }, cols)));
        const datetime = parseCreatePreview(request('convert_datetime', {}, cols)).specification;
        assert.ok(datetime.method === 'convert_datetime');
        assert.equal(datetime.parameters.timezone, 'UTC');
        assert.throws(() => parseCreatePreview(request('convert_boolean', { trueValues: ['YES'], falseValues: ['yes'] }, cols)));
        assert.throws(() => parseCreatePreview(request('ordinal', { mapping: [{ value: { kind: 'null', value: null }, label: 1 }] }, cols)));
        const ordinal = parseCreatePreview(request('ordinal', { mapping: [{ value: { kind: 'text', value: 'a' }, label: -0.5 }], keepSource: true }, cols));
        assert.ok(ordinal.specification.method === 'ordinal');
        assert.equal(ordinal.specification.parameters.mapping[0].label, -0.5);
    });
    test('diagnostics sample cap does not hide total counts or lose error priority', () => {
        const errors = Array.from({ length: 120 }, () => ({ code: 'DOMAIN_ERROR', message: 'Lỗi' }));
        const warnings = Array.from({ length: 10 }, () => ({ code: 'WARN', message: 'Cảnh báo' }));
        const result = buildDiagnostics(errors, warnings);
        assert.equal(result.errorCount, 120);
        assert.equal(result.warningCount, 10);
        assert.equal(result.errors.length, 100);
        assert.equal(result.warnings.length, 0);
        assert.equal(result.truncated, true);
        const mixed = buildDiagnostics(errors.slice(0, 90), warnings.concat(warnings));
        assert.equal(mixed.errors.length + mixed.warnings.length, 100);
        assert.equal(mixed.warningCount, 20);
    });
});
