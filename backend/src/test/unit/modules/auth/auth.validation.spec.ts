import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parseRegister, parseLogin, parseEmptyBody } from '../../../../modules/auth/dto/auth.validation';


describe('modules/auth/auth.validation contracts (unit)', () => {
    test('ASCII email normalization and password byte length preserve passwords exactly', () => {
        const password = ' mật khẩu dài ';
        const registered = parseRegister({ email: ' USER+tag@Example.com ', password });
        assert.equal(registered.email, 'user+tag@example.com');
        assert.equal(registered.password, password);
        assert.throws(() => parseRegister({ email: 'tên@example.com', password }));
        assert.throws(() => parseRegister({ email: 'a@example.com', password: 'é'.repeat(37) }));
        assert.doesNotThrow(() => parseRegister({ email: 'a@example.com', password: 'é'.repeat(36) }));
        assert.doesNotThrow(() => parseLogin({ email: 'a@example.com', password: 'x' }));
        assert.throws(() => parseLogin({ email: 'a@example.com', password: '' }));
        assert.throws(() => parseRegister({ email: 'a@example.com', password, displayName: 'extra' }));
        assert.deepEqual(parseEmptyBody(undefined), {});
        assert.throws(() => parseEmptyBody({ token: 'secret' }));
    });
});
