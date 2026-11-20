import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSuggestions, suggestionSpecification, type AiSuggestion, type AiSuggestions, type SuggestionsFetcher } from '../../src/features/processing/ai-suggestions';
import { onlineProcessing } from '../../src/features/processing/services/online-processing';
import { configureAuthTransport } from '../../src/shared/api';

const suggestion: AiSuggestion = { id: 'one', reason: 'HTML', evidence: '1/2', caution: 'Review', specification: { method: 'strip_html', parameters: { decodeEntities: true }, scope: { type: 'columns', columnIds: ['last'] }, statisticsScope: { type: 'whole-columns' } } };
void test('allows any dataset column independently of manual selection; rejects invalid group, schema, scope or parameters', () => {
  assert.equal(suggestionSpecification(suggestion, 'cleaning', ['first', 'last']).method, 'strip_html');
  assert.throws(() => suggestionSpecification(suggestion, 'missing', ['first', 'last']));
  assert.throws(() => suggestionSpecification(suggestion, 'cleaning', ['first']));
  assert.throws(() => suggestionSpecification({ ...suggestion, specification: { ...suggestion.specification, scope: { type: 'dataset' } } }, 'cleaning', ['last']));
  assert.throws(() => suggestionSpecification({ ...suggestion, specification: { ...suggestion.specification, scope: { type: 'cell', rowId: 'r', columnId: 'last' } } }, 'cleaning', ['last']));
  const invalid = structuredClone(suggestion); Object.assign(invalid.specification.parameters, { decodeEntities: 'invalid' });
  assert.throws(() => suggestionSpecification(invalid, 'cleaning', ['last']));
});
void test('online request contains only group and batch, binds version and never invokes Preview/Apply', async () => {
  configureAuthTransport({ token: () => 'token', refresh: async () => {}, owner: () => 'user' });
  const previous = globalThis.fetch; const requests: string[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      requests.push(String(url)); assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer token'); assert.deepEqual(JSON.parse(String(init?.body)), { group: 'cleaning', batch: 0 });
      return new Response(JSON.stringify({ versionId: requests.length === 1 ? 'v' : 'stale' }));
    };
    const adapter = onlineProcessing('d', 'v');
    await adapter.suggestions!('cleaning', new AbortController().signal);
    await assert.rejects(adapter.suggestions!('cleaning', new AbortController().signal), /phiên bản/);
    assert.ok(requests.every(url => url.endsWith('/datasets/d/versions/v/ai/suggestions')));
  } finally { globalThis.fetch = previous; }
});
function response(batch: number): AiSuggestions {
  return { versionId: 'v', group: 'cleaning', columnIds: ['first', 'last'], columnCount: 2, rowCount: 3, model: 'qwen3:4b', generatedAt: '', candidateCount: 13, reviewedCandidateCount: batch ? 13 : 12, batch, totalBatches: 2, nextBatch: batch ? null : 1, suggestions: [{ ...suggestion, id: `suggestion-${batch}` }] };
}
void test('automatically follows every batch and accumulates suggestions instead of truncating at 12', async () => {
  const batches: number[] = [], progress: AiSuggestions[] = [];
  await scanSuggestions(async (_group, _signal, batch = 0) => { batches.push(batch); return response(batch); }, 'cleaning', ['first', 'last'], new AbortController().signal, data => { progress.push(data); });
  assert.deepEqual(batches, [0, 1]); assert.equal(progress.at(-1)?.suggestions.length, 2);
  assert.equal(progress.at(-1)?.reviewedCandidateCount, 13); assert.equal(progress.at(-1)?.nextBatch, null);
});
void test('partial failure and cancellation never report a completed scan', async () => {
  const partial: AiSuggestions[] = [];
  const fetcher: SuggestionsFetcher = async (_group, _signal, batch = 0) => { if (batch) throw new Error('Ollama unavailable'); return response(0); };
  await assert.rejects(scanSuggestions(fetcher, 'cleaning', ['first', 'last'], new AbortController().signal, data => { partial.push(data); }), /unavailable/);
  assert.equal(partial.length, 1); assert.equal(partial[0].nextBatch, 1);
  const abort = new AbortController(), calls: number[] = [];
  await assert.rejects(scanSuggestions(async (_group, _signal, batch = 0) => { calls.push(batch); return response(batch); }, 'cleaning', ['first', 'last'], abort.signal, () => { abort.abort(); }));
  assert.deepEqual(calls, [0]);
});
void test('rejects mismatched versions, columns, duplicate IDs, invalid progress or looping batches', async () => {
  for (const mutate of [
    (data: AiSuggestions) => ({ ...data, versionId: 'other' }),
    (data: AiSuggestions) => ({ ...data, columnIds: ['first'] }),
    (data: AiSuggestions) => ({ ...data, suggestions: [{ ...suggestion, id: 'suggestion-0' }] }),
    (data: AiSuggestions) => ({ ...data, reviewedCandidateCount: 12 }),
    (data: AiSuggestions) => ({ ...data, nextBatch: 1 }),
  ]) await assert.rejects(scanSuggestions(async (_group, _signal, batch = 0) => batch ? mutate(response(batch)) : response(batch), 'cleaning', ['first', 'last'], new AbortController().signal, () => {}));
});
