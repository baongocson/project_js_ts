const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string,
    public readonly details?: unknown, public readonly requestId?: string, public readonly retryAfter?: number) {
    super(message); this.name = 'ApiError';
  }
  get fieldErrors(): Record<string, string> {
    const issues = record(this.details).issues;
    const fields: Record<string, string> = {};
    if (Array.isArray(issues)) for (const item of issues) {
      const issue = record(item);
      if (typeof issue.path === 'string' && typeof issue.message === 'string') fields[issue.path] = issue.message;
    }
    return fields;
  }
}
export class NetworkError extends Error {
  constructor() { super('Không thể kết nối API. Dữ liệu trên máy được giữ nguyên.'); this.name = 'NetworkError'; }
}
interface AuthTransport { token(): string | null; refresh(rejectedToken: string | null): Promise<void>; owner?(): string | null; invalidate?(): void }
let authTransport: AuthTransport | undefined;
export function configureAuthTransport(transport: AuthTransport) { authTransport = transport; }
export interface RequestOptions extends RequestInit {
  auth?: boolean;
  /** Explicit opt-in for a mutation whose replay is semantically safe. */
  replay?: 'safe';
  json?: unknown;
  /** Replay adapters bind every request to the authenticated account that owns the outbox. */
  expectedUserId?: string;
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}
export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (/^(?:[a-z]+:|\/\/)/i.test(path) || path.includes('..')) throw new Error('Đường dẫn API không hợp lệ');
  const { auth = true, replay, json, expectedUserId, ...init } = options;
  const boundOwner = expectedUserId ?? (auth ? authTransport?.owner?.() : undefined);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  if (init.body instanceof FormData) headers.delete('Content-Type');
  const method = (init.method || 'GET').toUpperCase();
  const canReplay = ['GET', 'HEAD', 'OPTIONS'].includes(method) || replay === 'safe' || headers.has('Idempotency-Key');
  const send = async (): Promise<Response> => {
    if (boundOwner && (!auth || authTransport?.owner?.() !== boundOwner))
      throw new ApiError(401, 'ACCOUNT_MISMATCH', 'Tài khoản đã thay đổi; yêu cầu đồng bộ đã bị chặn.');
    const token = auth ? authTransport?.token() : null;
    if (auth) {
      headers.delete('Authorization');
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    try {
      return await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, {
        ...init, method, headers, body: json === undefined ? init.body : JSON.stringify(json),
        credentials: init.credentials ?? 'same-origin', cache: 'no-store',
      });
    } catch (error) {
      if (init.signal?.aborted || error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new NetworkError();
    }
  };
  const rejectedToken = authTransport?.token() ?? null;
  let response = await send();
  if (auth && response.status === 401 && authTransport && !init.signal?.aborted) {
    await authTransport.refresh(rejectedToken);
    if (canReplay) {
      init.signal?.throwIfAborted(); response = await send();
      if (response.status === 401) authTransport.invalidate?.();
    }
  }
  if (!response.ok) {
    let envelope: unknown;
    try { envelope = await response.json(); } catch { /* A proxy may return non-JSON errors. */ }
    const error = record(record(envelope).error);
    const retry = response.headers.get('Retry-After');
    const retryAfter = retry === null ? undefined : /^\d+$/.test(retry)
      ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
    throw new ApiError(response.status, typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
      typeof error.message === 'string' ? error.message : `API trả mã ${response.status}`,
      error.details, typeof error.requestId === 'string' ? error.requestId : undefined,
      Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  if (response.status === 204 || method === 'HEAD') return undefined as T;
  try { return await response.json() as T; }
  catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'API trả dữ liệu không hợp lệ.'); }
}
