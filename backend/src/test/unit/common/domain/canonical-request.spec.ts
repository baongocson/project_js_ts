import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { canonicalRequest } from '../../../../common/domain/canonical-request';


describe('common/domain/canonical-request contracts (unit)', () => {
    test('canonical hash normalization preserves data and selection order', () => {
        assert.equal(canonicalRequest({ b: 2, a: 1 }), canonicalRequest({ a: 1, b: 2 }));
        assert.notEqual(canonicalRequest({ value: ' a' }), canonicalRequest({ value: 'a' }));
        assert.notEqual(canonicalRequest({ value: 'é' }), canonicalRequest({ value: 'e\u0301' }));
        assert.notEqual(canonicalRequest([1, 2]), canonicalRequest([2, 1]));
        assert.throws(() => canonicalRequest({ a: undefined }));
    });
});
