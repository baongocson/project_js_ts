import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { importCsv } from '@dashboard/data-core';
import { buildCandidates } from '../../../../modules/ai/ai-candidates';
import { parseSuggestionRequest } from '../../../../modules/ai/ai.contract';
import { AiService } from '../../../../modules/ai/ai.service';
import { OllamaService } from '../../../../modules/ai/ollama.service';
import { validateEnvironment } from '../../../../config/environment';

function fixture(csv = 'description,code,amount\n <b>Hello</b> ,00123,1\n plain ,00456,2\nplain,00789,\n') {
  let i = 0;
  return importCsv(new TextEncoder().encode(csv), { delimiter: ',' }, () => `00000000-0000-4000-8000-${String(++i).padStart(12, '0')}`);
}
const principal = { userId: 'owner', sessionId: 'session' };
afterEach(() => { jest.restoreAllMocks(); });

describe('AI input and candidates', () => {
  test('accepts a group without manual selection and rejects invalid batch or overrides', () => {
    expect(parseSuggestionRequest({ group: 'cleaning' })).toEqual({ group: 'cleaning', batch: 0 });
    expect(parseSuggestionRequest({ group: 'cleaning', batch: 2 })).toEqual({ group: 'cleaning', batch: 2 });
    for (const body of [{ group: 'history' }, { group: 'cleaning', columnIds: [] }, { group: 'cleaning', method: 'strip_html' }, { group: 'cleaning', batch: -1 }, { group: 'cleaning', batch: 0.5 }, { group: 'cleaning', batch: 1001 }, { group: 'cleaning', batch: null }]) expect(() => parseSuggestionRequest(body)).toThrow();
  });
  test('uses all rows and columns, preserves identifiers, checks duplicate rows against every column', () => {
    const snapshot = fixture(); const before = JSON.stringify(snapshot);
    const result = buildCandidates(snapshot, 'cleaning');
    expect(result.candidates.map(c => c.specification.method)).toEqual(['strip_html', 'normalize_whitespace']);
    expect(result.candidates[0].evidence).toContain('1/3');
    expect(JSON.stringify(snapshot)).toBe(before);
    const distinct = fixture('a,b\nx,1\nx,2\n');
    expect(buildCandidates(distinct, 'cleaning').candidates).toEqual([]);
    const duplicates = fixture('a,b\nx,1\nx,1\n');
    expect(buildCandidates(duplicates, 'cleaning').candidates[0].specification.scope).toEqual({ type: 'dataset' });
  });
  test('scopes missing/scaling/encoding/transformation/outliers to compatible columns', () => {
    const snapshot = fixture(); const ids = snapshot.columns.map(c => c.columnId);
    expect(buildCandidates(snapshot, 'missing').candidates.map(c => c.specification.method)).toEqual(['fill_median', 'fill_mean']);
    expect(buildCandidates(snapshot, 'scaling').candidates.every(c => c.specification.scope.type === 'columns' && c.specification.scope.columnIds[0] === ids[2])).toBe(true);
    const extremes = fixture('n\n1\n1\n1\n1\n100\n');
    expect(buildCandidates(extremes, 'outliers').candidates[0].specification.method).toBe('clip_iqr');
    expect(buildCandidates(snapshot, 'transformation').candidates.map(c => c.specification.method)).toContain('log1p');
    const categories = fixture('cat\na\nb\na\n');
    expect(buildCandidates(categories, 'encoding').candidates[0].specification.method).toBe('one_hot');
  });
  test('local configuration refuses cloud/remote targets and unbounded timeouts', () => {
    for (const env of [{ AI_OLLAMA_URL: 'https://example.com' }, { AI_OLLAMA_URL: 'http://127.0.0.1:11434/remote' }, { AI_TIMEOUT_MS: 9999999 }, { AI_MODEL: 'cloud-model' }]) expect(() => validateEnvironment(env)).toThrow();
    expect(() => validateEnvironment({ AI_OLLAMA_URL: 'http://127.0.0.1:11434', AI_ENABLED: 'true' })).not.toThrow();
  });
});

describe('AI service ownership and immutable suggestions', () => {
  test('authorizes before loading, dry-runs without mutating snapshot or publishing', async () => {
    const snapshot = fixture(), before = JSON.stringify(snapshot), calls: string[] = [];
    const service = new AiService({ dataset: async () => { calls.push('owner'); }, version: async () => { calls.push('version'); } } as never,
      { load: async () => { calls.push('load'); return { snapshot }; } } as never,
      { enabled: true, model: 'qwen3:4b', rank: async () => [{ id: 'suggestion-1', reason: 'Cân nhắc bỏ HTML.' }] } as never);
    const result = await service.suggest(principal, 'd', 'v', { group: 'cleaning', batch: 0 });
    expect(calls).toEqual(['owner', 'version', 'load']); expect(result.versionId).toBe('v'); expect(result.suggestions[0].specification.method).toBe('strip_html'); expect(JSON.stringify(snapshot)).toBe(before);
  });
  test('denied owner cannot load data or invoke model', async () => {
    const load = jest.fn(), rank = jest.fn();
    const denied = new AiService({ dataset: async () => { throw new Error('FORBIDDEN'); } } as never, { load } as never, { enabled: true, rank } as never);
    await expect(denied.suggest(principal, 'd', 'v', { group: 'cleaning', batch: 0 })).rejects.toThrow('FORBIDDEN');
    expect(load).not.toHaveBeenCalled(); expect(rank).not.toHaveBeenCalled();
  });
  test('scans beyond 20 columns and 12 candidates without silently dropping the last column', async () => {
    const count = 25;
    const snapshot = fixture(Array.from({ length: count }, (_, i) => 'column' + i).join(',') + '\n' + Array(count).fill('<b>Hello</b>').join(',') + '\n' + Array(count).fill('plain').join(','));
    const before = JSON.stringify(snapshot), reviewed: string[] = [];
    const rank = async (_group: string, _rows: number, candidates: { id: string }[]) => {
      reviewed.push(...candidates.map(c => c.id));
      return candidates.slice(-1).map(c => ({ id: c.id, reason: 'Cân nhắc bỏ HTML.' }));
    };
    const service = new AiService({ dataset: async () => {}, version: async () => {} } as never, { load: async () => ({ snapshot }) } as never, { enabled: true, model: 'qwen3:4b', rank } as never);
    const results = [];
    let batch: number | null = 0;
    while (batch !== null) {
      const result = await service.suggest(principal, 'd', 'v', { group: 'cleaning', batch });
      results.push(result); batch = result.nextBatch;
    }
    expect(results.map(r => r.reviewedCandidateCount)).toEqual([12, 24, 25]);
    expect(results.every(r => r.columnCount === 25 && r.columnIds.length === 25 && r.candidateCount === 25)).toBe(true);
    expect(new Set(reviewed).size).toBe(25);
    expect(results[2].suggestions[0].specification.scope).toEqual({ type: 'columns', columnIds: [snapshot.columns[24].columnId] });
    expect(JSON.stringify(snapshot)).toBe(before);
    await expect(service.suggest(principal, 'd', 'v', { group: 'cleaning', batch: 3 })).rejects.toThrow('Lượt phân tích');
  });
  test('no candidates returns empty without invoking model', async () => {
    const snapshot = fixture('a\nhello\n'), rank = jest.fn();
    const service = new AiService({ dataset: async () => {}, version: async () => {} } as never, { load: async () => ({ snapshot }) } as never, { enabled: true, model: 'qwen3:4b', rank } as never);
    expect((await service.suggest(principal, 'd', 'v', { group: 'cleaning', batch: 0 })).suggestions).toEqual([]); expect(rank).not.toHaveBeenCalled();
  });
});

describe('Ollama structured response boundary', () => {
  const snapshot = fixture(); const candidates = buildCandidates(snapshot, 'cleaning').candidates;
  const service = () => new OllamaService(new ConfigService({ AI_ENABLED: 'true' }));
  test('cancelling a scan aborts inference and releases the model lock', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    fetchMock.mockImplementationOnce((_url, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => { reject(new DOMException('cancelled', 'AbortError')); }, { once: true });
    }));
    const abort = new AbortController(), ai = service();
    const pending = ai.rank('cleaning', 3, candidates, abort.signal); abort.abort();
    await expect(pending).rejects.toThrow('Đã hủy');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: '{"suggestions":[]}' } })));
    expect(await ai.rank('cleaning', 3, candidates)).toEqual([]);
  });
  test('sends only bounded evidence and schema; accepts valid selection', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: { content: JSON.stringify({ suggestions: [{ id: 'suggestion-1', reason: 'Có dấu hiệu HTML.' }] }) } })));
    const ai = new OllamaService(new ConfigService({ AI_OLLAMA_URL: 'http://127.0.0.1:11434/' }));
    expect(await ai.rank('cleaning', 3, candidates)).toEqual([{ id: 'suggestion-1', reason: 'Có dấu hiệu HTML.' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]!.body)); expect(body.think).toBe(false); expect(body.options.num_ctx).toBe(4096);
    expect(body.messages[1].content).not.toContain('<b>Hello</b>'); expect(body.messages[1].content).not.toContain('description'); expect(body.messages[1].content).not.toContain(snapshot.columns[0].columnId);
  });
  test('rejects unknown/duplicate selections and malformed output, releases lock after failure', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch'); const ai = service();
    for (const content of ['invalid JSON', '{"suggestions":[{"id":"invented","reason":"x"}]}', '{"suggestions":[{"id":"suggestion-1","reason":"x"},{"id":"suggestion-1","reason":"x"}]}']) {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: { content } })));
      await expect(ai.rank('cleaning', 3, candidates)).rejects.toThrow('Không lấy được gợi ý hợp lệ');
    }
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: '{"suggestions":[]}' } })));
    expect(await ai.rank('cleaning', 3, candidates)).toEqual([]);
  });
  test('disabled, unavailable, timeout and busy produce controlled errors', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(new OllamaService(new ConfigService({ AI_ENABLED: 'false' })).rank('cleaning', 3, candidates)).rejects.toThrow('đang tắt'); expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    await expect(service().rank('cleaning', 3, candidates)).rejects.toThrow('quá thời gian');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(service().rank('cleaning', 3, candidates)).rejects.toThrow('Không lấy được');
    let finish!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    const ai = service(), pending = ai.rank('cleaning', 3, candidates);
    await expect(ai.rank('cleaning', 3, candidates)).rejects.toThrow('yêu cầu khác');
    finish(new Response(JSON.stringify({ message: { content: '{"suggestions":[]}' } }))); await pending;
  });
});
