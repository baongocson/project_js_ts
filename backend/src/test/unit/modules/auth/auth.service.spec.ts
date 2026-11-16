import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthModule } from '../../../../modules/auth/auth.module';
import { AuthService } from '../../../../modules/auth/auth.service';
import { AuthGuard } from '../../../../modules/auth/auth.guard';
import { AuthRepository } from '../../../../modules/auth/auth.repository';
describe('Auth module (unit — current main scaffold)', () => {
    let module: TestingModule;
    beforeEach(async () => { module = await Test.createTestingModule({ imports: [AuthModule] }).compile(); });
    afterEach(async () => { await module?.close(); });
    it('registers service, guard and flat repository as Nest providers', () => {
        expect(module.get(AuthService)).toBeInstanceOf(AuthService);
        expect(module.get(AuthGuard)).toBeInstanceOf(AuthGuard);
        expect(module.get(AuthRepository)).toBeInstanceOf(AuthRepository);
    });
    it('reports unimplemented registration instead of returning fake success', () => {
        expect(() => module.get(AuthService).pending('register')).toThrow(expect.objectContaining({ status: 501, response: expect.objectContaining({ code: 'NOT_IMPLEMENTED', details: { module: 'auth', action: 'register' } }) }));
    });
});
