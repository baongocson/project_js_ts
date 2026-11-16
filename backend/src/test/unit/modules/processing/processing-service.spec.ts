import { describe, test } from '@jest/globals';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import type { Snapshot } from '@dashboard/data-core';
import { ProcessingService } from '../../../../modules/processing/processing.service';
import type { PreviewRecord } from '../../../../modules/processing/processing.repository';
import type { CreatePreviewDto } from '../../../../modules/processing/dto/processing.dto';
const datasetId = '0123456789abcdef01234567';
const baseVersionId = '0123456789abcdef01234568';
const projectId = '0123456789abcdef01234569';
const candidateVersionId = '0123456789abcdef01234570';
const col = '00000000-0000-4000-8000-000000000001';
const row = '00000000-0000-4000-8000-000000000002';
const principal = { userId: '0123456789abcdef01234571', sessionId: '0123456789abcdef01234572' };
const base: Snapshot = { columns: [{ columnId: col, name: 'score', position: 0, logicalType: 'number', format: null, lineage: null }], rows: [{ rowId: row, position: 0, cells: { [col]: { kind: 'null', value: null } } }] };
const spec = (value: number): CreatePreviewDto => ({ baseVersionId, specification: { method: 'fill_constant', parameters: { value: { kind: 'number', value } }, scope: { type: 'columns', columnIds: [col] }, statisticsScope: { type: 'whole-columns' } } });
function setup(snapshot: Snapshot = base) {
  let saved: PreviewRecord | undefined;
  let staged = 0, applied = 0, savedChanges = 0, completed = 0;
  const repository = {
    transaction: async <T>(work: (session: never) => Promise<T>): Promise<T> => work({} as never),
    insert: async (preview: PreviewRecord) => { saved = preview; },
    insertChanges: async (_previewId: Types.ObjectId, changes: unknown[]) => { savedChanges += changes.length; },
    ready: async (_previewId: Types.ObjectId, status: 'ready' | 'invalid') => { if (saved) saved.status = status; },
    get: async () => saved!,
    listChanges: async () => ({ items: [], total: 0 }),
    markApplied: async () => { applied++; if (saved) saved.status = 'applied'; },
  };
  const datasets = { readSnapshot: async () => snapshot, readPreviewCandidate: async () => snapshot };
  const datasetRecords = { byId: async () => ({ lifecycle: 'ready', currentVersionId: new Types.ObjectId(baseVersionId), revision: 1 }) };
  const publisher = {
    prepare: async () => { staged++; return candidateVersionId; },
    publish: async (_lease: unknown, _input: unknown, response: (version: number, id: string, createdAt: Date) => unknown, participant: (s: never) => Promise<void>) => {
      await participant({} as never);
      return response(2, '0123456789abcdef01234573', new Date('2026-11-16T10:00:00Z'));
    },
  };
  const receipts = {
    claim: async () => ({ replay: false, lease: { token: 'lease' } }),
    run: async <T>(_lease: unknown, work: () => Promise<T>): Promise<T> => work(),
    touch: async () => {},
    complete: async () => { completed++; },
  };
  const ownership = { dataset: async () => ({ projectId: new Types.ObjectId(projectId) }) };
  const service = new ProcessingService(repository as never, datasets as never, datasetRecords as never, publisher as never, receipts as never, ownership as never);
  return { service, get saved() { return saved; }, get staged() { return staged; }, get applied() { return applied; }, get savedChanges() { return savedChanges; }, get completed() { return completed; } };
}
describe('BE-3 Preview/Apply orchestration with storage and receipt doubles', () => {
  test('ready preview stages once and records all changed rows; Apply CAS participant once', async () => {
    const env = setup();
    const preview = await env.service.createPreview(principal, datasetId, spec(7), 'key-preview');
    assert.equal(preview.status, 'ready');
    assert.equal(preview.canApply, true);
    assert.equal(preview.summary.updatedCellCount, 1);
    assert.equal(env.staged, 1);
    assert.equal(env.savedChanges, 1);
    assert.equal(env.completed, 1);
    assert.equal(env.saved?.candidateVersionId?.toHexString(), candidateVersionId);
    const result = await env.service.apply(principal, datasetId, { previewId: preview.previewId }, 'key-apply');
    assert.equal(result.dataset.currentVersionId, candidateVersionId);
    assert.equal(result.dataset.revision, 2);
    assert.equal(env.applied, 1);
  });
  test('no-op ready preview cannot Apply and does not stage a candidate', async () => {
    const populated: Snapshot = { ...base, rows: [{ ...base.rows[0], cells: { [col]: { kind: 'number', value: 7 } } }] };
    const env = setup(populated);
    const response = await env.service.createPreview(principal, datasetId, spec(7), 'key-noop');
    assert.equal(response.status, 'ready');
    assert.equal(response.canApply, false);
    assert.equal(env.staged, 0);
    await assert.rejects(() => env.service.apply(principal, datasetId, { previewId: response.previewId }, 'key-noop-apply'));
  });
  test('invalid processing returns 201-shaped invalid response, never stages', async () => {
    const textSnapshot: Snapshot = { columns: [{ ...base.columns[0], logicalType: 'text' }], rows: [{ ...base.rows[0], cells: { [col]: { kind: 'text', value: 'not-a-number' } } }] };
    const env = setup(textSnapshot);
    const input: CreatePreviewDto = { baseVersionId, specification: { method: 'convert_number', parameters: { decimalSeparator: '.', allowThousands: false }, scope: { type: 'columns', columnIds: [col] }, statisticsScope: { type: 'whole-columns' } } };
    const response = await env.service.createPreview(principal, datasetId, input, 'key-invalid');
    assert.equal(response.status, 'invalid');
    assert.equal(response.canApply, false);
    assert.equal(response.diagnostics.errorCount, 1);
    assert.equal(env.staged, 0);
  });
});
