export function validateEnvironment(env: Record<string, unknown>) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  const enabled = String(env.DATABASE_ENABLED ?? 'false');
  if (!['true', 'false'].includes(enabled)) throw new Error('DATABASE_ENABLED must be true or false');
  if (enabled === 'true' && !env.MONGODB_URI) throw new Error('MONGODB_URI is required when database is enabled');
  const origin = String(env.FRONTEND_ORIGIN ?? 'http://localhost:5173');
  for (const entry of origin.split(',')) {
    const url = new URL(entry.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== entry.trim()) throw new Error('FRONTEND_ORIGIN must contain exact HTTP origins');
  }
  return { ...env, PORT: port, DATABASE_ENABLED: enabled, FRONTEND_ORIGIN: origin };
}
