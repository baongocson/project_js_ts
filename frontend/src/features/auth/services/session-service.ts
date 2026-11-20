import { ApiError, NetworkError, configureAuthTransport } from '../../../shared/api';
import { authApi } from '../api/auth-api';
import type { Credentials, SessionState, TokenResponse } from '../types';

let state: SessionState = { status: 'loading', user: null };
let accessToken: string | null = null;
let expiresAt = 0;
let generation = 0;
let refreshFlight: Promise<void> | undefined;
let bootstrapFlight: Promise<void> | undefined;
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('fe-session-v1');
const emit = () => listeners.forEach(listener => listener());
function setState(next: SessionState) { state = next; emit(); }
function clear(status: SessionState['status'] = 'anonymous', message?: string) {
  generation++; accessToken = null; expiresAt = 0;
  setState({ status, user: null, message });
}
function install(response: TokenResponse, broadcast = true) {
  accessToken = response.accessToken;
  expiresAt = Date.now() + response.expiresIn * 1000;
  if (broadcast) channel?.postMessage({ type: 'token', accessToken, expiresAt });
}
function locallySignedOut() {
  try { return localStorage.getItem('fe-local-signout') === 'true'; } catch { return false; }
}
function markSignedOut(value: boolean) {
  try { if (value) localStorage.setItem('fe-local-signout', 'true'); else localStorage.removeItem('fe-local-signout'); } catch { /* Storage may be unavailable. */ }
}
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!event.data || typeof event.data !== 'object') return;
  const data = event.data as Record<string, unknown>;
  if (data.type === 'clear') clear();
  if (data.type === 'request' && accessToken && expiresAt > Date.now() + 30_000)
    channel.postMessage({ type: 'token', accessToken, expiresAt });
  if (data.type === 'token' && typeof data.accessToken === 'string' && typeof data.expiresAt === 'number'
      && data.expiresAt > Date.now() && !locallySignedOut()) {
    const previous = accessToken;
    accessToken = data.accessToken; expiresAt = data.expiresAt;
    if (previous !== accessToken && !refreshFlight) {
      generation++;
      setState({ status: 'loading', user: null });
      void loadProfile().catch(() => { /* Error is exposed in session state. */ });
    }
  }
});
async function refresh(rejectedToken: string | null): Promise<void> {
  if (locallySignedOut()) throw new ApiError(401, 'LOCAL_SIGNOUT', 'Vui lòng đăng nhập lại.');
  if (accessToken && accessToken !== rejectedToken && expiresAt > Date.now() + 30_000) return;
  if (refreshFlight) return refreshFlight;
  const currentGeneration = generation;
  const work = async () => {
    if (channel) {
      channel.postMessage({ type: 'request' });
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    if (generation !== currentGeneration) throw new ApiError(401, 'SESSION_CHANGED', 'Phiên đã thay đổi.');
    if (accessToken && accessToken !== rejectedToken && expiresAt > Date.now() + 30_000) return;
    const response = await authApi.refresh();
    if (generation !== currentGeneration) throw new ApiError(401, 'SESSION_CHANGED', 'Phiên đã thay đổi.');
    install(response);
  };
  refreshFlight = Promise.resolve(navigator.locks ? navigator.locks.request('fe-auth-cookie', work) : work())
    .then(() => undefined)
    .catch((error: unknown) => {
      if (generation === currentGeneration) {
        if (error instanceof ApiError && error.status === 401) { clear(); channel?.postMessage({ type: 'clear' }); }
        else if (error instanceof NetworkError) clear('offline', error.message);
        else setState({ ...state, status: 'error', message: error instanceof Error ? error.message : 'Không thể khôi phục phiên.' });
      }
      throw error;
    }).finally(() => { refreshFlight = undefined; });
  return refreshFlight;
}
async function loadProfile() {
  const stamp = generation;
  try {
    const user = await authApi.me();
    if (stamp === generation) setState({ status: 'authenticated', user });
  } catch (error) {
    if (stamp === generation) clear(error instanceof NetworkError ? 'offline' : error instanceof ApiError && error.status === 401 ? 'anonymous' : 'error',
      error instanceof Error ? error.message : 'Không lấy được hồ sơ.');
    throw error;
  }
}
async function bootstrap() {
  if (bootstrapFlight) return bootstrapFlight;
  bootstrapFlight = (async () => {
    if (locallySignedOut()) { clear(); return; }
    if (!navigator.onLine) { clear('offline'); return; }
    try { await refresh(null); await loadProfile(); } catch { /* State contains the failure. */ }
  })().finally(() => { bootstrapFlight = undefined; });
  return bootstrapFlight;
}
configureAuthTransport({ token: () => accessToken, refresh,
  owner: () => state.status === 'authenticated' ? state.user?._id ?? null : null,
  invalidate: () => { clear(); channel?.postMessage({ type: 'clear' }); },
});
export const session = {
  accessToken: () => accessToken,
  getSnapshot: () => state,
  bootstrap,
  verify: loadProfile,
  async recover() { await refresh(null); await loadProfile(); },
  async login(credentials: Credentials) {
    generation++;
    const stamp = generation;
    const run = async () => {
      const response = await authApi.login(credentials);
      if (stamp !== generation) return;
      markSignedOut(false); install(response); setState({ status: 'authenticated', user: response.user });
    };
    await (navigator.locks ? navigator.locks.request('fe-auth-cookie', run) : run());
  },
  async logout(localOnly = false) {
    clear(); markSignedOut(true); channel?.postMessage({ type: 'clear' });
    const stamp = generation;
    if (!localOnly) {
      const run = () => {
        if (stamp !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Phiên đã thay đổi.');
        return authApi.logout();
      };
      await (navigator.locks ? navigator.locks.request('fe-auth-cookie', run) : run());
    }
  },
  async patch(patch: Parameters<typeof authApi.patch>[0]) {
    const stamp = generation;
    const updated = await authApi.patch(patch);
    if (stamp === generation && state.user?._id === updated._id) setState({ ...state, user: { ...state.user, ...updated } });
  },
  async deleteAccount() {
    const stamp = generation;
    await authApi.delete();
    if (stamp === generation) { clear(); markSignedOut(true); channel?.postMessage({ type: 'clear' }); }
  },
};

export function subscribeSession(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
