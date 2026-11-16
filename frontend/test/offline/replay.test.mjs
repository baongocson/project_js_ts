import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOfflineQueue } from '../../src/features/offline/queue.ts';
import { replayOfflineQueue } from '../../src/features/offline/replay.ts';
import { SyncHttpError } from '../../src/features/offline/types.ts';

const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const V1 = '111111111111111111111111';
const V2 = '222222222222222222222222';
const V3 = '333333333333333333333333';
const PREVIEW = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ENGINE = 'be3-a45-v1';

class MemoryQueueStore {
  constructor() { this.records = new Map(); }
  async load(id) { const value = this.records.get(id); return value && structuredClone(value); }
  async save(queue) { this.records.set(queue.id, structuredClone(queue)); }
}

const proc = (baseVersionId = V1) => ({
  commandId: randomUUID(), kind: 'process', baseVersionId,
  specification: {method: 'uppercase', scope: {type:'columns', columnIds:[randomUUID()]}, parameters:{}, statisticsScope:{type:'whole-columns'}},
  previewKey: randomUUID(), applyKey: randomUUID(), phase: 'queued'
});
const rest = (baseVersionId = V1) => ({
  commandId: randomUUID(), kind:'restore', baseVersionId, targetVersionId:V3, restoreKey:randomUUID(), phase:'queued'
});
function setup(commands = [proc()]) {
  const q = createOfflineQueue({ id: randomUUID(), accountId:'user-A', datasetId: ID, engineVersion:ENGINE, currentServerVersionId:V1, commands });
  const store = new MemoryQueueStore();
  let head = V1, account = 'user-A';
  const calls = {preview:[], apply:[], restore:[], remote:0};
  const adapter = {
    async currentAccountId() { return account; },
    async remoteState(datasetId) { calls.remote++; return { accountId:account, datasetId, resourceAvailable:true, currentVersionId:head, engineVersion:ENGINE }; },
    async preview(datasetId, baseVersionId, specification, key) { calls.preview.push({key, datasetId, baseVersionId, specification}); return {previewId:PREVIEW, baseVersionId, engineVersion:ENGINE, status:'ready', canApply:true}; },
    async apply(datasetId, previewId, key) { calls.apply.push({datasetId, previewId, key}); head = V2; return {newVersionId:V2}; },
    async restore(datasetId, targetVersionId, baseVersionId, key) {calls.restore.push({datasetId, targetVersionId, baseVersionId, key}); head=V2; return {newVersionId:V2};}
  };
  return { q, store, adapter, calls, get head(){return head}, set head(v){head=v}, set account(v){account=v} };
}

test('replay processes Preview then Apply, checkpoints confirmed version', async () => {
  const s = setup(); await s.store.save(s.q);
  const result = await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.deepEqual(result,{status:'synced',cursor:1});
  const saved = await s.store.load(s.q.id);
  assert.equal(saved.commands[0].phase,'confirmed');
  assert.equal(saved.commands[0].confirmedVersionId,V2);
  assert.equal(saved.currentServerVersionId,V2);
  assert.equal(s.calls.preview[0].key,s.q.commands[0].previewKey);
  assert.equal(s.calls.apply[0].key,s.q.commands[0].applyKey);
});

test('unknown Apply response after server commit retries SAME key without creating another Preview', async () => {
  const s=setup();await s.store.save(s.q);
  const apply=s.adapter.apply;let first=true;
  s.adapter.apply=async (...args)=>{const result=await apply(...args);if(first){first=false;throw new Error('socket lost after commit');}return result;};
  assert.equal((await replayOfflineQueue(s.store,s.adapter,s.q.id)).status,'retry');
  let current=await s.store.load(s.q.id);
  assert.equal(current.commands[0].phase,'apply-sent');
  assert.equal(current.cursor,0);
  assert.equal((await replayOfflineQueue(s.store,s.adapter,s.q.id)).status,'synced');
  current=await s.store.load(s.q.id);
  assert.equal(current.cursor,1);
  assert.equal(s.calls.preview.length,1);
  assert.equal(s.calls.apply.length,2);
  assert.equal(s.calls.apply[0].key,s.calls.apply[1].key);
});

test('stale server base stops without sending any mutation', async()=>{
  const s=setup();s.head=V2;await s.store.save(s.q);
  const r=await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.deepEqual(r,{status:'conflict',cursor:0,error:'BASE_VERSION_STALE'});
  assert.equal(s.calls.preview.length,0);assert.equal(s.calls.apply.length,0);
});

test('wrong authenticated account blocks before any API mutation',async()=>{
  const s=setup();s.account='user-B';await s.store.save(s.q);
  assert.equal((await replayOfflineQueue(s.store,s.adapter,s.q.id)).error,'SYNC_ACCOUNT_MISMATCH');
  assert.equal(s.calls.preview.length,0);assert.equal(s.calls.remote,0);
});

test('401 blocks with all retry keys and cursor unchanged',async()=>{
  const s=setup();await s.store.save(s.q);
  s.adapter.preview=async()=>{throw new SyncHttpError(401,'UNAUTHORIZED','Session expired')};
  const r=await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.equal(r.status,'blocked');assert.equal(r.error,'UNAUTHORIZED');
  assert.equal((await s.store.load(s.q.id)).commands[0].phase,'preview-sent');
});

test('unknown Restore response replays original restore key even after version advances',async()=>{
  const s=setup([rest()]);await s.store.save(s.q);
  const restore=s.adapter.restore;let first=true;
  s.adapter.restore=async (...args)=>{const value=await restore(...args);if(first){first=false;throw new Error('disconnect');}return value;};
  assert.equal((await replayOfflineQueue(s.store,s.adapter,s.q.id)).status,'retry');
  assert.equal((await replayOfflineQueue(s.store,s.adapter,s.q.id)).status,'synced');
  assert.equal(s.calls.restore.length,2);
  assert.equal(s.calls.restore[0].key,s.calls.restore[1].key);
});

test('mismatched Preview engine stops without Apply',async()=>{
  const s=setup();await s.store.save(s.q);
  s.adapter.preview=async()=>({previewId:PREVIEW,baseVersionId:V1,engineVersion:'incompatible',status:'ready',canApply:true});
  const r=await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.equal(r.status,'conflict');assert.equal(s.calls.apply.length,0);
});

test('later offline command with unresolved local-to-server base must stop, never guess mapping',async()=>{
  const s=setup([proc(V1),proc(V1)]);await s.store.save(s.q);
  const r=await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.equal(r.status,'conflict');assert.equal(r.cursor,1);
  assert.equal(r.error,'SYNC_MAPPING_REQUIRED');
  assert.equal(s.calls.apply.length,1);
});

test('queue rejects accidental key duplication and invalid IDs',()=>{
  const a=proc(),b=proc();b.applyKey=a.previewKey;
  assert.throws(()=>createOfflineQueue({id:randomUUID(),accountId:'user-A',datasetId:ID,engineVersion:ENGINE,currentServerVersionId:V1,commands:[a,b]}),/OFFLINE_IDEMPOTENCY_KEY_INVALID/);
  assert.throws(()=>createOfflineQueue({id:randomUUID(),accountId:'user-A',datasetId:'not-id',engineVersion:ENGINE,currentServerVersionId:V1,commands:[proc()]}),/OFFLINE_QUEUE_INVALID/);
});

test('unknown server-head verification failure never marks synced',async()=>{
  const s=setup();await s.store.save(s.q);
  const apply=s.adapter.apply;s.adapter.apply=async (...args)=>{await apply(...args);s.head=V3;return {newVersionId:V2}};
  const r=await replayOfflineQueue(s.store,s.adapter,s.q.id);
  assert.equal(r.status,'conflict');assert.equal(r.cursor,0);
  assert.equal((await s.store.load(s.q.id)).commands[0].phase,'apply-sent');
});
