import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parsePatchUser } from '../../../modules/users/dto/user.validation';
import { parseProjectName } from '../../../modules/projects/dto/project.validation';


describe('contracts/profile-project contracts (unit)', () => {
    test('profile and project names count Unicode code points, support explicit clear, and keep normalization local', () => {
        assert.equal(parseProjectName({ name: '  e\u0301  ' }).name, 'e\u0301');
        assert.doesNotThrow(() => parseProjectName({ name: '😀'.repeat(100) }));
        assert.throws(() => parseProjectName({ name: '😀'.repeat(101) }));
        assert.throws(() => parsePatchUser({ displayName: '  ' }));
        assert.deepEqual(parsePatchUser({ displayName: null }), { displayName: null });
        assert.deepEqual(parsePatchUser({ displayName: ' A ', preferences: {} }), { displayName: 'A' });
        assert.throws(() => parsePatchUser({ preferences: {} }));
        assert.throws(() => parsePatchUser({ preferences: { theme: null } }));
        assert.deepEqual(parsePatchUser({ preferences: { theme: 'system' } }), { preferences: { theme: 'system' } });
    });
});
