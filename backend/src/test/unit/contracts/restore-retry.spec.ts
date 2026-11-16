import { test, describe } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { assertPreviewReadable } from '../../../modules/processing/preview-read-policy';
import { assertRestoreTarget } from '../../../modules/history/restore-policy';
import { failedRequestAction } from '../../../infrastructure/idempotency/retry-policy';

const id = '0123456789abcdef01234567';
function code(error: unknown): unknown { assert.ok(error instanceof HttpException); const body = error.getResponse(); assert.ok(typeof body === 'object' && body !== null && 'code' in body); return body.code; }

describe('contracts/restore-retry contracts (unit)', () => {
    test('restore and preview lifecycle preserve receipt-before-state contract and distinguish expired from purged', () => {
        assert.throws(() => assertRestoreTarget({ _id: id, datasetId: id, state: 'published' }, id, id), e => e instanceof HttpException && e.getStatus() === 409 && code(e) === 'NO_CHANGES_TO_RESTORE');
        for (const target of [null, { _id: 'f'.repeat(24), datasetId: id, state: 'staged' }])
            assert.throws(() => assertRestoreTarget(target, id, id), e => e instanceof HttpException && e.getStatus() === 404);
        assert.doesNotThrow(() => assertRestoreTarget({ _id: 'f'.repeat(24), datasetId: id, state: 'published' }, id, id));
        assert.throws(() => assertPreviewReadable(null, new Date(10)), e => e instanceof HttpException && e.getStatus() === 404);
        assert.throws(() => assertPreviewReadable({ expiresAt: new Date(10) }, new Date(10)), e => e instanceof HttpException && e.getStatus() === 410);
        assert.doesNotThrow(() => assertPreviewReadable({ expiresAt: new Date(11) }, new Date(10)));
        assert.equal(failedRequestAction({ failure: 'deterministic', rollbackConfirmed: true }), 'replay-error');
        assert.equal(failedRequestAction({ failure: 'transient', rollbackConfirmed: true }), 'claim-with-cas');
        assert.equal(failedRequestAction({ failure: 'transient', rollbackConfirmed: false }), 'recover');
    });
});
