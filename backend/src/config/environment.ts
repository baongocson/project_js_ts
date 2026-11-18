export function validateEnvironment(env: Record<string, unknown>) {
  if (env.AI_ENABLED !== undefined && !['true', 'false'].includes(String(env.AI_ENABLED))) throw new Error('AI_ENABLED must be true or false');
  if (env.AI_OLLAMA_URL !== undefined) {
    const url = new URL(String(env.AI_OLLAMA_URL));
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('AI_OLLAMA_URL must be a loopback HTTP origin');
  }
  if (env.AI_MODEL !== undefined && env.AI_MODEL !== 'qwen3:4b') throw new Error('AI_MODEL must be qwen3:4b for this integration');
  if (env.AI_TIMEOUT_MS !== undefined && (!Number.isSafeInteger(Number(env.AI_TIMEOUT_MS)) || Number(env.AI_TIMEOUT_MS) < 1000 || Number(env.AI_TIMEOUT_MS) > 180000)) throw new Error('AI_TIMEOUT_MS must be 1000..180000');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  const enabled = String(env.DATABASE_ENABLED ?? 'false');
  if (!['true', 'false'].includes(enabled)) throw new Error('DATABASE_ENABLED must be true or false');
  if (enabled === 'true' && !env.MONGODB_URI) throw new Error('MONGODB_URI is required when database is enabled');
  if (enabled === 'true' && (typeof env.AUTH_ACCESS_TOKEN_SECRET !== 'string' || Buffer.byteLength(env.AUTH_ACCESS_TOKEN_SECRET, 'utf8') < 32)) throw new Error('AUTH_ACCESS_TOKEN_SECRET must contain at least 32 UTF-8 bytes');
  for (const key of ['AUTH_REGISTER_LIMIT', 'AUTH_LOGIN_LIMIT', 'AUTH_LOGIN_FAILURE_LIMIT', 'AUTH_REFRESH_LIMIT', 'AUTH_LOGOUT_LIMIT']) {
    if (env[key] !== undefined && (!/^\d+$/.test(String(env[key])) || !Number.isSafeInteger(Number(env[key])) || Number(env[key]) < 1)) throw new Error(`${key} must be a positive integer`);
  }
  for (const key of ['AUTH_TOKEN_ISSUER', 'AUTH_TOKEN_AUDIENCE']) {
    if (env[key] !== undefined && (typeof env[key] !== 'string' || !env[key].trim())) throw new Error(`${key} must be a non-empty string`);
  }
  if (env.ACCOUNT_CLEANUP_ENABLED !== undefined && !['true', 'false'].includes(String(env.ACCOUNT_CLEANUP_ENABLED))) throw new Error('ACCOUNT_CLEANUP_ENABLED must be true or false');
  const origin = String(env.FRONTEND_ORIGIN ?? 'http://localhost:5173');
  const lease = Number(env.IDEMPOTENCY_LEASE_MS ?? 60_000), heartbeat = Number(env.IDEMPOTENCY_HEARTBEAT_MS ?? 20_000);
  if (!Number.isSafeInteger(lease) || !Number.isSafeInteger(heartbeat) || heartbeat < 1 || lease <= heartbeat) throw new Error('Idempotency timing requires 0 < heartbeat < lease');
  if (env.PROJECT_CLEANUP_ENABLED !== undefined && !['true', 'false'].includes(String(env.PROJECT_CLEANUP_ENABLED))) throw new Error('PROJECT_CLEANUP_ENABLED must be true or false');
  if (env.IMPORT_RECOVERY_ENABLED !== undefined && !['true', 'false'].includes(String(env.IMPORT_RECOVERY_ENABLED))) throw new Error('IMPORT_RECOVERY_ENABLED must be true or false');
  for (const entry of origin.split(',')) {
    const url = new URL(entry.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== entry.trim()) throw new Error('FRONTEND_ORIGIN must contain exact HTTP origins');
  }
  return { ...env, PORT: port, DATABASE_ENABLED: enabled, FRONTEND_ORIGIN: origin };
}
