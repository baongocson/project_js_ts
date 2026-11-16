const { randomBytes } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

const backendFile = resolve(__dirname, '../.env');
const fallbackFile = resolve(__dirname, '../../atlas-credentials.env');
const localText = existsSync(backendFile) ? readFileSync(backendFile, 'utf8') : '';
const fallback = existsSync(fallbackFile) ? parseEnv(readFileSync(fallbackFile, 'utf8')) : {};
const local = parseEnv(localText);
const current = { ...fallback, ...local, ...process.env }.AUTH_ACCESS_TOKEN_SECRET;
if (current && Buffer.byteLength(current, 'utf8') < 32) {
  throw new Error('Existing AUTH_ACCESS_TOKEN_SECRET is too short; no file was changed.');
}
if (current) {
  console.log('An auth secret is already configured; preserved without printing it.');
} else {
  const secret = randomBytes(48).toString('base64url');
  const line = `AUTH_ACCESS_TOKEN_SECRET=${secret}`;
  const expression = /^\s*(?:export\s+)?AUTH_ACCESS_TOKEN_SECRET\s*=.*$/m;
  const updated = expression.test(localText) ? localText.replace(expression, line) : localText + (localText.endsWith('\n') || !localText ? '' : '\n') + line + '\n';
  writeFileSync(backendFile, updated, { mode: 0o600 });
  console.log('Generated an auth secret in backend/.env; no secret was printed. Do not commit .env.');
}
