import { requestJson } from '../../../shared/api';
import type { Credentials, TokenResponse, User, Theme } from '../types';

const cookie = { auth: false, credentials: 'include' as const, method: 'POST' };
export const authApi = {
  register: (credentials: Credentials) => requestJson<{ user: User }>('auth/register', { ...cookie, json: credentials }),
  login: (credentials: Credentials) => requestJson<TokenResponse & { user: User }>('auth/login', { ...cookie, json: credentials }),
  refresh: () => requestJson<TokenResponse>('auth/refresh', cookie),
  logout: () => requestJson<void>('auth/logout', cookie),
  me: () => requestJson<User>('users/me'),
  patch: (patch: { displayName?: string | null; preferences?: { theme: Theme } }) =>
    requestJson<Pick<User, '_id' | 'displayName' | 'preferences' | 'updatedAt'>>('users/me', { method: 'PATCH', json: patch, replay: 'safe' }),
  delete: () => requestJson<void>('users/me', { method: 'DELETE' }),
};
