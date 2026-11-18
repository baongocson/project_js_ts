/* global __ENV */
import http from 'k6/http';
import { check, fail } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

// The runner supplies synthetic credentials through a temporary file, never CLI tokens.
const fixture = new SharedArray('isolated-fixture', () => JSON.parse(open(__ENV.PERF_FIXTURE))); // eslint-disable-line no-undef
const csv = open(__ENV.PERF_CSV); // eslint-disable-line no-undef
const profile = __ENV.PERF_PROFILE || 'load';
const duration = __ENV.PERF_DURATION || '10m';
const iterations = Number(__ENV.PERF_ITERATIONS || 20);
const rate = Number(__ENV.PERF_RATE || 10);
const elapsed = new Trend('perf_duration', true);
const errors = new Rate('perf_errors');
const samples = new Counter('perf_samples');
const statuses = new Counter('perf_statuses');
const completed = new Counter('perf_completed');
const valid = new Counter('perf_valid');
const limits = profile === 'load'
  ? { me: 1000, projects: 1000, project: 1000, workspace: 1000, history: 1000 }
  : profile === 'data'
    ? { import_e2e: 10000, rows: 2000, rows_filter: 2000, summary: 3000, distribution: 3000,
      correlation: 3000, points3d: 3000, preview: 10000, tfidf: 30000, one_hot: 30000, apply: 5000, restore: 5000 }
    : { ai_warm: 60000 };
const thresholds = { perf_errors: ['rate<0.01'], perf_completed: [`count>=${profile === 'load' ? Number(__ENV.PERF_EXPECTED || 6000) : iterations}`] };
for (const status of [0, 200, 201, 400, 401, 403, 404, 409, 410, 413, 429, 500, 503]) {
  thresholds[`perf_statuses{status:${status}}`] = ['count>=0'];
}
for (const [op, limit] of Object.entries(limits)) {
  thresholds[`perf_duration{op:${op}}`] = [`p(95)<=${limit}`];
  thresholds[`perf_valid{op:${op}}`] = [`count>=${profile === 'load' ? 1 : iterations}`];
}
if (profile === 'load') thresholds.dropped_iterations = ['count==0'];

export const options = {
  scenarios: profile === 'load'
    ? { load: { executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration, preAllocatedVUs: 5, maxVUs: 5, gracefulStop: '30s' } }
    : { [profile]: { executor: 'shared-iterations', vus: profile === 'ai' ? 1 : Math.min(5, iterations), iterations, maxDuration: profile === 'ai' ? '50m' : '30m' } },
  thresholds, summaryTrendStats: ['min', 'med', 'p(95)', 'max', 'avg'],
  systemTags: ['status', 'method', 'name', 'scenario', 'expected_response'],
};

let revision;
let alternateTab = false;
function request(user, method, path, op, expected = 200, body, measured = true, predicate = () => true) {
  const json = body !== undefined && !(body.file);
  const headers = { Authorization: `Bearer ${user.token}`, Origin: __ENV.PERF_ORIGIN };
  if (json) headers['Content-Type'] = 'application/json';
  if (method === 'POST' && !path.endsWith('/ai/suggestions')) {
    headers['Idempotency-Key'] = `${profile}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}-${op}`;
  }
  const start = Date.now();
  const response = http.request(method, `${__ENV.PERF_BASE}${path}`, json ? JSON.stringify(body) : body,
    { headers, tags: { name: op, phase: measured ? 'measured' : 'support' }, timeout: profile === 'ai' ? '125s' : '60s' });
  const ms = Date.now() - start;
  let data;
  try { data = response.json(); } catch { data = null; }
  const ok = response.status === expected && predicate(data);
  check(response, { [op]: () => ok });
  if (measured) {
    elapsed.add(ms, { op }); samples.add(1, { op }); errors.add(!ok);
    statuses.add(1, { op, status: String(response.status), code: String(data?.error?.code || 'none') });
    if (ok) valid.add(1, { op });
  }
  if (!ok && !measured) fail(`Support step ${op} failed (${response.status}); no response body logged`);
  return { data, ok };
}

function must(result, op) {
  if (!result.ok) fail(`${op} failed; this iteration cannot continue`);
  return result.data;
}

function load(user) {
  if (revision === undefined) revision = user.revision;
  const slot = exec.scenario.iterationInTest % 5;
  if (slot === 0) request(user, 'GET', '/users/me', 'me', 200, undefined, true, d => !!d?._id);
  if (slot === 1) request(user, 'GET', '/projects?page=1&limit=10', 'projects', 200, undefined, true, d => Array.isArray(d?.items));
  if (slot === 2) request(user, 'GET', `/projects/${user.project}`, 'project', 200, undefined, true, d => !!d?.workspace);
  if (slot === 3) {
    alternateTab = !alternateTab;
    const result = request(user, 'PATCH', `/projects/${user.project}/workspace`, 'workspace', 200,
      { revision, boundVersionId: user.version, activeTab: alternateTab ? 'missing' : 'collection' }, true, d => !!d?.workspace);
    if (result.ok) revision = result.data.workspace.revision;
  }
  if (slot === 4) request(user, 'GET', `/datasets/${user.dataset}/operations?page=1&limit=20`, 'history', 200, undefined, true, d => Array.isArray(d?.items));
}

function dataWorkflow(user) {
  const created = must(request(user, 'POST', '/projects', 'create', 201,
    { name: `perf-data-${exec.scenario.iterationInTest}` }, false), 'create');
  const imported = must(request(user, 'POST', `/projects/${created.project._id}/datasets`, 'import_e2e', 201,
    { file: http.file(csv, 'synthetic.csv', 'text/csv'), importOptions: JSON.stringify({ delimiter: ',' }) }, true,
    d => d?.version?.rowCount === 10000 && d?.columns?.length === 20), 'import');
  const dataset = imported.dataset._id, version = imported.version._id;
  const root = `/datasets/${dataset}/versions/${version}`;
  const columns = imported.columns;
  const ids = names => names.map(name => columns.find(c => c.name === name).columnId);
  const [x, y, z] = ids(['x', 'y', 'z']);
  request(user, 'GET', `${root}/rows?page=1&limit=10`, 'rows', 200, undefined, true, d => d?.rows?.length === 10);
  const filters = encodeURIComponent(JSON.stringify([{ columnId: x, op: 'gte', value: { kind: 'number', value: 10 } }]));
  request(user, 'GET', `${root}/rows?page=1&limit=10&sort=${x}:asc&filters=${filters}`, 'rows_filter', 200, undefined, true, d => d?.rows?.length === 10);
  request(user, 'GET', `${root}/analysis/summary`, 'summary', 200, undefined, true, d => d?.rowCount === 10000);
  request(user, 'GET', `${root}/analysis/columns/${x}/distribution?bins=20`, 'distribution', 200, undefined, true, d => !!d?.columnId);
  request(user, 'GET', `${root}/analysis/correlation?method=pearson`, 'correlation', 200, undefined, true, d => Array.isArray(d?.matrix));
  request(user, 'GET', `${root}/analysis/points-3d?xColumnId=${x}&yColumnId=${y}&zColumnId=${z}&maxPoints=10000`, 'points3d', 200, undefined, true, d => Array.isArray(d?.points));
  function preview(method, names, parameters, op) {
    return request(user, 'POST', `/datasets/${dataset}/previews`, op, 201,
      { baseVersionId: version, specification: { method, parameters, scope: { type: 'columns', columnIds: ids(names) }, statisticsScope: { type: 'whole-columns' } } },
      true, d => d?.status === 'ready' && d?.canApply === true);
  }
  preview('tfidf', ['text'], { maxFeatures: 16, keepSource: true }, 'tfidf');
  preview('one_hot', ['category'], { keepSource: true }, 'one_hot');
  const candidate = must(preview('fill_mean', ['missing_number'], {}, 'preview'), 'preview');
  const applied = must(request(user, 'POST', `/datasets/${dataset}/operations`, 'apply', 201,
    { previewId: candidate.previewId }, true, d => !!d?.dataset?.currentVersionId), 'apply');
  request(user, 'POST', `${root}/restore`, 'restore', 201,
    { expectedCurrentVersionId: applied.dataset.currentVersionId }, true, d => !!d?.newVersion?._id);
}

export default function () {
  const user = fixture[(exec.vu.idInTest - 1) % 5];
  if (profile === 'load') load(user);
  else if (profile === 'data') dataWorkflow(user);
  else if (profile === 'ai') request(user, 'POST', `/datasets/${user.dataset}/versions/${user.version}/ai/suggestions`, 'ai_warm', 201,
    { group: 'missing', batch: 0 }, true, d => d?.candidateCount > 0 && Array.isArray(d?.suggestions));
  else fail('Unknown profile');
  completed.add(1);
}

export function handleSummary(data) {
  const rows = Object.keys(limits).map(op => {
    const values = data.metrics[`perf_duration{op:${op}}`]?.values || {};
    const count = data.metrics[`perf_valid{op:${op}}`]?.values?.count || 0;
    return `| ${op} | ${count} | ${values.med?.toFixed(2) ?? '—'} | ${values['p(95)']?.toFixed(2) ?? '—'} | ${values.min?.toFixed(2) ?? '—'} | ${values.max?.toFixed(2) ?? '—'} | ${limits[op]} |`;
  });
  const failed = Object.entries(data.metrics).flatMap(([name, m]) => Object.entries(m.thresholds || {}).filter(([, t]) => !t.ok).map(([t]) => `${name}: ${t}`));
  const statusRows = Object.entries(data.metrics).filter(([name]) => name.startsWith('perf_statuses{')).map(([name, metric]) =>
    `| ${name.match(/status:(\d+)/)?.[1]} | ${metric.values.count} |`);
  const markdown = `# Kết quả k6 — ${profile}\n\nThời điểm UTC: ${new Date().toISOString()}\n\n` +
    `Kết luận threshold: **${failed.length ? 'KHÔNG ĐẠT' : 'ĐẠT'}**. Phạm vi môi trường xem metadata.json và hướng dẫn.\n\n` +
    `| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n` +
    `Lỗi đo: ${((data.metrics.perf_errors?.values?.rate || 0) * 100).toFixed(3)}%. ` +
    `Iterations hoàn tất: ${data.metrics.perf_completed?.values?.count || 0}. ` +
    `Dropped iterations: ${data.metrics.dropped_iterations?.values?.count || 0}.\n\n` +
    `Threshold không đạt: ${failed.length ? failed.join('; ') : 'không có'}.\n\n` +
    `| HTTP status (0 = transport error) | Số request đo |\n| --- | --- |\n${statusRows.join('\n')}\n\n` +
    `Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.\n`;
  return { [__ENV.PERF_OUTPUT + '.json']: JSON.stringify(data, null, 2), [__ENV.PERF_OUTPUT + '.md']: markdown, stdout: markdown };
}
