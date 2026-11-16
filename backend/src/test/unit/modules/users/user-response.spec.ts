import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { publicUser, registerResponse, loginResponse, patchUserResponse } from '../../../../modules/users/dto/user-response.mapper';

const id = '0123456789abcdef01234567';

describe('modules/users/user-response contracts (unit)', () => {
    test('public user projection cannot leak database fields or nested preferences secrets', () => {
        const source = { _id: id, email: 'a@example.com', displayName: null, createdAt: new Date(0), updatedAt: new Date(0), passwordHash: 'secret', preferences: { theme: 'dark' as const, internal: 'secret' } };
        const result = publicUser(source);
        assert.equal(result.createdAt, '1970-01-01T00:00:00.000Z');
        assert.deepEqual(result.preferences, { theme: 'dark' });
        for (const response of [result, registerResponse(source), loginResponse(source, 'access', 900), patchUserResponse(source)])
            assert.equal(JSON.stringify(response).includes('secret'), false);
        assert.equal(Object.hasOwn(registerResponse(source).user, 'updatedAt'), false);
        assert.equal(Object.hasOwn(loginResponse(source, 'access', 900).user, 'createdAt'), false);
        assert.deepEqual(publicUser({ ...source, preferences: undefined }).preferences, { theme: 'system' });
    });
});
