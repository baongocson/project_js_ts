/* Synthetic data only. Runs the production suggestion service without a database or writes. */
require('reflect-metadata');
const { ConfigService } = require('@nestjs/config');
const { importCsv } = require('@dashboard/data-core');
const { OllamaService } = require('../backend/dist/modules/ai/ollama.service');
const { AiService } = require('../backend/dist/modules/ai/ai.service');

async function main() {
  const tags = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(5000) }).then(r => r.json());
  if (!tags.models.some(model => model.name === 'qwen3:4b')) throw new Error('Missing qwen3:4b; run npm run ai:setup.');
  let id = 0;
  const snapshot = importCsv(new TextEncoder().encode('description,amount\n <b>Hello</b> ,1\n Plain text ,2\nPlain text,\n'), { delimiter: ',' }, () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`);
  const before = JSON.stringify(snapshot);
  const service = new AiService({ dataset: async () => {}, version: async () => {} }, { load: async () => ({ snapshot }) }, new OllamaService(new ConfigService({ AI_ENABLED: 'true' })));
  for (const group of ['cleaning', 'missing']) {
    const start = Date.now();
    const result = await service.suggest({ userId: 'synthetic-owner', sessionId: 'synthetic-session' }, 'fixture', 'fixture-v1', { group, batch: 0 });
    if (!result.suggestions.length) throw new Error(`No suggestions returned for ${group} fixture.`);
    if (JSON.stringify(snapshot) !== before) throw new Error('Suggestion mutated source snapshot.');
    console.log(JSON.stringify({ group, model: result.model, elapsedMs: Date.now() - start, unchanged: true, suggestions: result.suggestions.map(item => ({ method: item.specification.method, reason: item.reason, evidence: item.evidence })) }, null, 2));
  }
  // Only the last of 25 columns needs cleaning. No manual column or method is supplied.
  let wideId = 100;
  const wide = importCsv(new TextEncoder().encode(Array.from({ length: 25 }, (_, i) => `column${i}`).join(',') + '\n' + [...Array(24).fill('plain'), '<b>last</b>'].join(',') + '\n' + Array(25).fill('next').join(',')), { delimiter: ',' }, () => `00000000-0000-4000-8000-${String(++wideId).padStart(12, '0')}`);
  const wideBefore = JSON.stringify(wide);
  const wideService = new AiService({ dataset: async () => {}, version: async () => {} }, { load: async () => ({ snapshot: wide }) }, new OllamaService(new ConfigService({ AI_ENABLED: 'true' })));
  const wideResult = await wideService.suggest({ userId: 'synthetic-owner', sessionId: 'synthetic-session' }, 'fixture', 'wide-v1', { group: 'cleaning', batch: 0 });
  if (wideResult.columnCount !== 25 || !wideResult.suggestions.some(s => s.specification.scope.type === 'columns' && s.specification.scope.columnIds.includes(wide.columns[24].columnId)) || JSON.stringify(wide) !== wideBefore) throw new Error('Whole-dataset scan missed the last column or mutated the fixture.');
  console.log(JSON.stringify({ scenario: '25 columns, only last column dirty, no manual selection', columnCount: wideResult.columnCount, candidateCount: wideResult.candidateCount, unchanged: true, methods: wideResult.suggestions.map(s => s.specification.method) }, null, 2));
  const loaded = await fetch('http://127.0.0.1:11434/api/ps').then(r => r.json());
  console.log(JSON.stringify({ loadedModels: loaded.models.map(m => ({ name: m.name, size: m.size, sizeVram: m.size_vram, contextLength: m.context_length })) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
