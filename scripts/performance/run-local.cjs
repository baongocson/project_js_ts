// Isolated production Nest + temporary MongoDB replica + temporary HTTPS proxy.
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { mkdtemp, mkdir, readFile, writeFile, rm } = require('node:fs/promises');
const { resolve, join, relative, isAbsolute, sep } = require('node:path');
const { tmpdir, cpus, totalmem, platform, release } = require('node:os');
const https = require('node:https');
const http = require('node:http');
const net = require('node:net');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createConnection } = require('mongoose');

const repo = resolve(__dirname, '../..'), backend = join(repo, 'backend');
const args = process.argv.slice(2);
const profile = args.find(x => x.startsWith('--profile='))?.split('=')[1] || 'load';
if (!['load', 'data', 'ai'].includes(profile)) throw new Error('profile must be load, data or ai');
const smoke = args.includes('--smoke');
const started = new Date();
const runId = started.toISOString().replace(/[:.]/g, '-') + '-' + profile + (smoke ? '-smoke' : '');
const out = join(repo, 'docs/performance/results', runId);
const origin = 'https://127.0.0.1:4443';

function exitOf(child) {
  return new Promise((done, reject) => { child.once('error', reject); child.once('exit', code => done(code ?? 1)); });
}
function api(path, method = 'GET', body, token) {
  return new Promise((done, reject) => {
    const buffer = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const request = https.request(origin + '/api/v1' + path, { method, rejectUnauthorized: false,
      headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(buffer ? { 'Content-Type': 'application/json', 'Content-Length': buffer.length } : {}), 'Idempotency-Key': randomUUID() } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode >= 400) return reject(new Error(`Fixture ${method} ${path.split('/')[1]} failed: ${response.statusCode}`));
        try { done(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(130000, () => request.destroy(new Error('Fixture request timed out')));
    request.on('error', reject); request.end(buffer);
  });
}
function syntheticCsv() {
  const names = ['x', 'y', 'z', 'missing_number', 'category', 'text', ...Array.from({ length: 14 }, (_, i) => `n${i}`)];
  const rows = [names.join(',')];
  for (let i = 0; i < 10000; i++) {
    const j = i % 1000; // exact duplicate rows every 1000, deterministic fixture
    rows.push([j === 999 ? 100000 : j, j % 73, j % 97, j % 10 === 0 ? '' : j % 31,
      `group${j % 5}`, `word${j % 8} common text`, ...Array.from({ length: 14 }, (_, c) => (j * (c + 1)) % 101)].join(','));
  }
  return rows.join('\n') + '\n';
}
async function main() {
  await mkdir(out, { recursive: true });
  const temp = await mkdtemp(join(tmpdir(), 'dashboard-k6-'));
  let replica, connection, server, backendProcess, child;
  const version = spawnSync(process.env.K6_BIN || 'k6', ['version'], { encoding: 'utf8', windowsHide: true });
  const metadata = { startedAt: started.toISOString(), profile, smoke, k6: (version.stdout || '').trim(), node: process.version,
    os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length, ramBytes: totalmem(),
    gitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout?.trim(),
    workingTreeDirty: Boolean(spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).stdout?.trim()),
    scriptSha256: createHash('sha256').update(await readFile(join(__dirname, 'dashboard.k6.js'))).digest('hex'),
    runnerSha256: createHash('sha256').update(await readFile(__filename)).digest('hex'),
    environment: 'Local isolated HTTPS/Nest production build/MongoDB replica, generator on same machine',
    tls: 'Self-signed temporary localhost certificate; verification disabled only for this isolated test process',
    limitations: ['Not deployment SLA: generator and database share the backend machine', 'No frontend metrics or RPO/RTO measured', 'Import metric includes upload', 'AI cold-start and multi-batch coverage not measured'],
    sessions: 20, activeVus: profile === 'ai' ? 1 : (profile === 'data' && smoke ? 2 : 5), authRateLimit: 'AUTH_REGISTER_LIMIT=100 only on the isolated process for fixture setup; other limits unchanged; auth excluded from measurements',
    duration: profile === 'load' ? (smoke ? '10s' : '10m') : null, iterations: profile === 'load' ? null : (smoke ? 2 : 20),
    ai: profile === 'ai' ? 'Real Ollama loopback qwen3:4b; warmup outside metrics' : 'disabled' };
  try {
    if (version.error || version.status !== 0) throw new Error('k6 not found. Set K6_BIN to the official executable; see docs/performance/README.md');
    for (const port of [4443, 4312]) await new Promise((done, reject) => {
      const probe = net.createServer(); probe.once('error', reject); probe.listen(port, '127.0.0.1', () => probe.close(done));
    });
    const cert = join(temp, 'cert.pem'), key = join(temp, 'key.pem');
    const certificate = spawnSync(process.env.OPENSSL_BIN || 'openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key,
      '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { windowsHide: true, stdio: 'pipe' });
    if (certificate.error || certificate.status !== 0) throw new Error('OpenSSL required (or set OPENSSL_BIN)');
    replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: join(backend, 'storage/test-binaries') },
      replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ ip: '127.0.0.1' }] });
    metadata.mongoVersion = '8.0.16';
    const dbName = `perf_${randomUUID().replaceAll('-', '')}`;
    connection = await createConnection(replica.getUri(), { dbName, autoCreate: false, autoIndex: false }).asPromise();
    const { provisionDatabase, verifyDatabase } = require('../../backend/dist/infrastructure/database/database.provision');
    await provisionDatabase(connection); await verifyDatabase(connection); await connection.close(); connection = undefined;
    backendProcess = spawn(process.execPath, ['dist/main.js'], { cwd: backend, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, PORT: '4312', HOST: '127.0.0.1', FRONTEND_ORIGIN: origin, DATABASE_ENABLED: 'true',
        MONGODB_URI: replica.getUri(), MONGODB_DB_NAME: dbName, AUTH_ACCESS_TOKEN_SECRET: randomBytes(48).toString('base64url'),
        AUTH_REGISTER_LIMIT: '100', AUTH_LOGIN_LIMIT: '60', AI_ENABLED: String(profile === 'ai'), AI_TIMEOUT_MS: '120000',
        AI_OLLAMA_URL: 'http://127.0.0.1:11434', AI_MODEL: 'qwen3:4b',
        ORIGINAL_STORAGE_ROOT: join(temp, 'originals'), ACCOUNT_CLEANUP_ENABLED: 'false', PROJECT_CLEANUP_ENABLED: 'false', IMPORT_RECOVERY_ENABLED: 'false' } });
    backendProcess.stderr.pipe(process.stderr);
    for (let i = 0; ; i++) {
      if (backendProcess.exitCode !== null) throw new Error('Backend exited before ready');
      try { if ((await fetch('http://127.0.0.1:4312/api/v1/health')).ok) break; } catch { /* readiness */ }
      if (i >= 150) throw new Error('Backend readiness timeout');
      await new Promise(done => setTimeout(done, 200));
    }
    server = https.createServer({ cert: await readFile(cert), key: await readFile(key) }, (req, res) => {
      const upstream = http.request({ hostname: '127.0.0.1', port: 4312, path: req.url, method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:4312' } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(upstream);
    });
    await new Promise((done, reject) => { server.once('error', reject); server.listen(4443, '127.0.0.1', done); });
    const csv = syntheticCsv();
    metadata.fixture = { rows: 10000, columns: 20, bytes: Buffer.byteLength(csv), sha256: createHash('sha256').update(csv).digest('hex'),
      numericColumns: 18, textColumns: 2, categories: 5, missing: '1000 cells', duplicates: '9000 rows', tfidfMaxFeatures: 16 };
    const users = [];
    console.log('Preparing 20 isolated sessions and 5 datasets (10,000 rows x 20 columns).');
    // Only this disposable process raises the registration limit for setup; auth is not benchmarked.
    for (let i = 0; i < 20; i++) {
      const email = `perf-${randomUUID()}@example.test`, password = randomBytes(24).toString('base64url');
      await api('/auth/register', 'POST', { email, password });
      const login = await api('/auth/login', 'POST', { email, password });
      if (i < 5) {
        const project = await api('/projects', 'POST', { name: `perf-seed-${i}` }, login.accessToken);
        // Use native multipart via HTTP, without disabling TLS process-wide.
        const boundary = 'perf-' + randomUUID();
        const payload = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="importOptions"\r\n\r\n{"delimiter":","}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.csv"\r\nContent-Type: text/csv\r\n\r\n${csv}\r\n--${boundary}--\r\n`);
        const imported = await new Promise((done, reject) => {
          const req = https.request(`${origin}/api/v1/projects/${project.project._id}/datasets`, { method: 'POST', rejectUnauthorized: false,
            headers: { Origin: origin, Authorization: `Bearer ${login.accessToken}`, 'Idempotency-Key': randomUUID(),
              'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': payload.length } }, res => {
            const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
              if (res.statusCode !== 201) return reject(new Error(`Fixture import failed: ${res.statusCode}`));
              try { done(JSON.parse(Buffer.concat(chunks))); } catch (error) { reject(error); }
            });
          }); req.on('error', reject); req.end(payload);
        });
        const detail = await api(`/projects/${project.project._id}`, 'GET', undefined, login.accessToken);
        users.push({ token: login.accessToken, project: project.project._id, dataset: imported.dataset._id,
          version: imported.version._id, revision: detail.workspace.revision });
      }
    }
    if (profile === 'ai') {
      console.log('Warming real Ollama model outside measured requests.');
      const warm = await api(`/datasets/${users[0].dataset}/versions/${users[0].version}/ai/suggestions`, 'POST', { group: 'missing', batch: 0 }, users[0].token);
      if (!(warm.candidateCount > 0)) throw new Error('AI fixture must have real candidates');
    }
    const fixtureFile = join(temp, 'sessions.json'), csvFile = join(temp, 'synthetic.csv');
    await writeFile(fixtureFile, JSON.stringify(users)); await writeFile(csvFile, csv);
    await writeFile(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    console.log(`Running ${profile}${smoke ? ' smoke' : ''}; results: ${relative(repo, out)}`);
    child = spawn(process.env.K6_BIN || 'k6', ['run', '--quiet', '--insecure-skip-tls-verify', '--new-machine-readable-summary=false',
      join(__dirname, 'dashboard.k6.js')], { cwd: repo, windowsHide: true, stdio: 'inherit',
      env: { ...process.env, PERF_FIXTURE: fixtureFile, PERF_CSV: csvFile, PERF_PROFILE: profile,
        PERF_BASE: origin + '/api/v1', PERF_ORIGIN: origin, PERF_OUTPUT: join(out, 'summary'),
        PERF_DURATION: smoke ? '10s' : '10m', PERF_EXPECTED: smoke ? '100' : '6000', PERF_ITERATIONS: smoke ? '2' : '20', PERF_RATE: '10' } });
    metadata.measuredStartedAt = new Date().toISOString();
    const code = await exitOf(child); child = undefined;
    metadata.finishedAt = new Date().toISOString(); metadata.k6ExitCode = code;
    await writeFile(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    process.exitCode = code;
  } catch (error) {
    metadata.finishedAt = new Date().toISOString(); metadata.runnerError = error.message;
    await writeFile(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    throw error;
  } finally {
    if (child?.exitCode === null) { const done = exitOf(child); child.kill(); await done; }
    if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
    if (backendProcess?.exitCode === null) { const done = exitOf(backendProcess); backendProcess.kill(); await done; }
    await connection?.close(); await replica?.stop();
    const rel = relative(resolve(tmpdir()), resolve(temp));
    if (rel.startsWith('dashboard-k6-') && !rel.includes(sep) && !isAbsolute(rel)) await rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
