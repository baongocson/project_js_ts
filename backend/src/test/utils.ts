import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';
import request, { type Test as HttpTest } from 'supertest';
import { ApiExceptionFilter } from '../common/filters/api-exception.filter';
import { AuthGuard } from '../modules/auth/auth.guard';
import { OwnershipGuard } from '../modules/auth/security/ownership.guard';
import { AuthMutationGuard } from '../modules/auth/security/auth-mutation.guard';
import { randomBytes } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../modules/auth/security/auth-context';
export function record(value: unknown): Record<string, unknown> {
    assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value));
    return value as Record<string, unknown>;
}
export async function createTestApp(databaseEnabled = false, validationOnly = false) {
    const previous = process.env.DATABASE_ENABLED;
    const previousSecret = process.env.AUTH_ACCESS_TOKEN_SECRET;
    const previousCleanup = process.env.ACCOUNT_CLEANUP_ENABLED;
    process.env.AUTH_ACCESS_TOKEN_SECRET = previousSecret || randomBytes(48).toString('base64url');
    process.env.ACCOUNT_CLEANUP_ENABLED = 'false';
    process.env.DATABASE_ENABLED = String(databaseEnabled);
    let app: INestApplication | undefined;
    function restore() { if (previous === undefined)
        delete process.env.DATABASE_ENABLED;
    else
        process.env.DATABASE_ENABLED = previous;
        if (previousSecret === undefined) delete process.env.AUTH_ACCESS_TOKEN_SECRET;
        else process.env.AUTH_ACCESS_TOKEN_SECRET = previousSecret;
        if (previousCleanup === undefined) delete process.env.ACCOUNT_CLEANUP_ENABLED;
        else process.env.ACCOUNT_CLEANUP_ENABLED = previousCleanup;
    }
    try {
        // AppModule reads DATABASE_ENABLED at import time, so import after setting it.
        const { AppModule } = await import('../app.module');
        const builder = Test.createTestingModule({ imports: [AppModule] });
        if (validationOnly) {
            if (databaseEnabled) throw new Error('Validation-only overrides cannot be used with a real database');
            builder.overrideProvider(AuthGuard).useValue({ canActivate(context: ExecutionContext) {
                context.switchToHttp().getRequest<AuthRequest>().principal = { userId: '0123456789abcdef01234567', sessionId: '0123456789abcdef01234568' };
                return true;
            } });
            builder.overrideProvider(OwnershipGuard).useValue({ canActivate: () => true });
            builder.overrideGuard(AuthMutationGuard).useValue({ canActivate: () => true });
        }
        const module = await builder.compile();
        app = module.createNestApplication();
        app.useLogger(false);
        // Match main.ts without changing the production bootstrap in this refactor.
        app.setGlobalPrefix('api/v1');
        const config = app.get(ConfigService);
        app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_ORIGIN').split(',').map(origin => origin.trim()), credentials: true });
        app.use(json({ limit: '1mb' }));
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
        app.useGlobalFilters(new ApiExceptionFilter());
        await app.init();
        const server: unknown = app.getHttpServer();
        assert.ok(server instanceof Server);
        const application = app;
        return { app: application, server, close: async () => { try {
                await application.close();
            }
            finally {
                restore();
            } } };
    }
    catch (error: unknown) {
        try {
            await app?.close();
        }
        finally {
            restore();
        }
        throw error;
    }
}
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export function http(server: Server, method: HttpMethod, route: string): HttpTest {
    const client = request(server);
    switch (method) {
        case 'GET': return client.get(route);
        case 'POST': return client.post(route);
        case 'PATCH': return client.patch(route);
        case 'DELETE': return client.delete(route);
    }
}
