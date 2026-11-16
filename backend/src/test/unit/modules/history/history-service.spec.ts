import { describe, test } from '@jest/globals';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { Snapshot } from '@dashboard/data-core';
import { HistoryService } from '../../../../modules/history/history.service';
import type { RestoreVersionResponseDto } from '../../../../modules/history/dto/history-response.dto';

const datasetId = '0123456789abcdef01234567';
const oldVersion = '0123456789abcdef01234568';
const targetVersion = '0123456789abcdef01234569';
const candidate = '0123456789abcdef01234570';
const project = '0123456789abcdef01234571';
const actor = '0123456789abcdef01234572';
const operation = '0123456789abcdef01234573';
const col = '00000000-0000-4000-8000-000000000001';
const row = '00000000-0000-4000-8000-000000000002';
const principal = { userId: actor, sessionId: '0123456789abcdef01234574' };
const currentSnapshot: Snapshot = {
  columns: [{ columnId: col, name: 'points', position: 0, logicalType: 'number', format: null, lineage: null }],
  rows: [{ rowId: row, position: 0, cells: { [col]: { kind: 'number', value: 10 } } }],
};
const targetSnapshot: Snapshot = {
  ...currentSnapshot,
  rows: [{ rowId: row, position: 0, cells: { [col]: { kind: 'number', value: 3 } } }],
};
const createdAt = new Date('2026-11-16T10:00:00Z');

function fixture(options: { current?: string; targetPublished?: boolean; replay?: boolean } = {}) {
  const calls: string[] = [];
  let prepared = 0, published = 0;
  const version = options.current ?? oldVersion;
  const replayBody: RestoreVersionResponseDto = {
    operation: { _id: operation, kind: 'restore', baseVersionId: oldVersion, resultVersionId: candidate, createdAt: createdAt.toISOString() },
    newVersion: { _id: candidate, versionNumber: 3, parentVersionId: oldVersion, restoredFromVersionId: targetVersion },
  };
  const ownership = {
    dataset: async () => { calls.push('owner'); return { projectId: new Types.ObjectId(project) }; },
  };
  const receipts = {
    claim: async (_p: unknown, _projectId: string, actionScope: string, _key: string, payload: unknown) => {
      calls.push('claim');
      assert.equal(actionScope, `v1.datasets.${datasetId}.versions.restore`);
      assert.equal((payload as { expectedCurrentVersionId: string }).expectedCurrentVersionId, oldVersion);
      assert.ok([targetVersion, oldVersion].includes((payload as { targetVersionId: string }).targetVersionId));
      return options.replay ? { replay: true, body: replayBody } : { replay: false, lease: { token: 'lease' } };
    },
    run: async <T>(_lease: unknown, work: () => Promise<T>): Promise<T> => work(),
  };
  const datasetRecords = {
    byId: async () => { calls.push('byId'); return { lifecycle: 'ready', currentVersionId: new Types.ObjectId(version), revision: 2 }; },
    version: async (_datasetId: string, id: string) => {
      calls.push('version');
      if (!options.targetPublished) throw new NotFoundException({ code: 'VERSION_NOT_FOUND' });
      return { version: { _id: new Types.ObjectId(id), datasetId: new Types.ObjectId(datasetId), state: 'published' } };
    },
  };
  const datasets = {
    readSnapshot: async (_principal: unknown, _datasetId: string, id: string) => {
      calls.push('snapshot');
      return id === targetVersion ? targetSnapshot : currentSnapshot;
    },
  };
  const publisher = {
    prepare: async (_lease: unknown, _datasetId: string, baseId: string, snapshot: Snapshot, restoredFromId: string) => {
      calls.push('prepare'); prepared++;
      assert.equal(baseId, oldVersion);
      assert.equal(restoredFromId, targetVersion);
      assert.deepEqual(snapshot, targetSnapshot);
      return candidate;
    },
    publish: async (_lease: unknown, input: { kind: string; expectedRevision: number; summary: { updatedCellCount: number }; specification: unknown }, response: (v: number, id: string, date: Date) => RestoreVersionResponseDto, participant: () => Promise<void>) => {
      calls.push('publish'); published++;
      assert.equal(input.kind, 'restore');
      assert.equal(input.expectedRevision, 2);
      const stored = input.specification as { targetVersionId: Types.ObjectId };
      assert.ok(stored.targetVersionId instanceof Types.ObjectId);
      assert.equal(stored.targetVersionId.toHexString(), targetVersion);
      assert.equal(input.summary.updatedCellCount, 1);
      await participant();
      return response(3, operation, createdAt);
    },
  };
  const repository = {
    list: async (_datasetId: string, query: unknown) => {
      calls.push('list');
      assert.deepEqual(query, { page: 2, limit: 20, kind: 'restore' });
      return { items: [{
        _id: new Types.ObjectId(operation), actorId: new Types.ObjectId(actor),
        baseVersionId: new Types.ObjectId(oldVersion), resultVersionId: new Types.ObjectId(candidate),
        kind: 'restore', specification: { targetVersionId: new Types.ObjectId(targetVersion) }, summary: { updatedCellCount: 1 }, createdAt,
      }], total: 21 };
    },
  };
  const service = new HistoryService(repository as never, ownership as never, datasetRecords as never, datasets as never, publisher as never, receipts as never);
  return { service, calls, get prepared() { return prepared; }, get published() { return published; }, replayBody };
}

describe('History Service restore / immutable transaction hand-off', () => {
  test('restores published target into a NEW version with parent and exact ledger date', async () => {
    const env = fixture({ targetPublished: true });
    const result = await env.service.restore(principal, datasetId, targetVersion, { expectedCurrentVersionId: oldVersion }, 'restore-key');
    assert.equal(result.newVersion.restoredFromVersionId, targetVersion);
    assert.equal(result.newVersion.parentVersionId, oldVersion);
    assert.equal(result.newVersion._id, candidate);
    assert.equal(result.newVersion.versionNumber, 3);
    assert.equal(result.operation.createdAt, createdAt.toISOString());
    assert.equal(env.prepared, 1); assert.equal(env.published, 1);
    assert.ok(env.calls.indexOf('claim') < env.calls.indexOf('byId'));
  });
  test('replays completed receipt without staging another version', async () => {
    const env = fixture({ replay: true });
    assert.deepEqual(await env.service.restore(principal, datasetId, targetVersion, { expectedCurrentVersionId: oldVersion }, 'restore-key'), env.replayBody);
    assert.equal(env.prepared, 0); assert.equal(env.published, 0);
    assert.deepEqual(env.calls, ['owner', 'claim']);
  });
  test('rejects stale expected current without staging', async () => {
    const env = fixture({ current: targetVersion, targetPublished: true });
    await assert.rejects(() => env.service.restore(principal, datasetId, targetVersion, { expectedCurrentVersionId: oldVersion }, 'restore-key'),
      (error: unknown) => error instanceof ConflictException && (error.getResponse() as { code: string }).code === 'BASE_VERSION_STALE');
    assert.equal(env.prepared, 0);
  });
  test('rejects restore to the current version without staging', async () => {
    const env = fixture({ current: oldVersion, targetPublished: true });
    await assert.rejects(() => env.service.restore(principal, datasetId, oldVersion, { expectedCurrentVersionId: oldVersion }, 'restore-key'),
      (error: unknown) => error instanceof ConflictException && (error.getResponse() as { code: string }).code === 'NO_CHANGES_TO_RESTORE');
    assert.equal(env.prepared, 0);
  });
  test('rejects unknown/unpublished target before staging', async () => {
    const env = fixture();
    await assert.rejects(() => env.service.restore(principal, datasetId, targetVersion, { expectedCurrentVersionId: oldVersion }, 'restore-key'), e => e instanceof NotFoundException);
    assert.equal(env.prepared, 0);
  });
  test('history listing checks ownership and returns paginated public operation', async () => {
    const env = fixture();
    const response = await env.service.listOperations(principal, datasetId, { page: 2, limit: 20, kind: 'restore' });
    assert.equal(response.total, 21);
    assert.equal(response.items[0].kind, 'restore');
    if (response.items[0].kind === 'restore') assert.equal(response.items[0].specification.targetVersionId, targetVersion);
    assert.equal(response.items[0].resultVersionId, candidate);
    assert.equal(response.items[0].createdAt, createdAt.toISOString());
    assert.deepEqual(env.calls, ['owner', 'list']);
  });
});
