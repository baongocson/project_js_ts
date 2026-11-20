import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessingSession } from '../../src/features/processing/services/processing-session';
import { ApiError,NetworkError } from '../../src/shared/api';
import { PreviewRejected } from '../../src/features/processing/types';
import { normalizeProjectName } from '../../src/features/projects/services/project-service';
import { readImportSource,previewImport,optionsFor } from '../../src/features/datasets/services/import-service';

void test('preview retries keep the same key after ambiguous failures and replace it only for new input, expiry or cancellation',()=>{
  const flow=new ProcessingSession();
  const key=flow.previewKey('same input');
  flow.previewFailed(new NetworkError());
  assert.equal(flow.previewKey('same input'),key);
  flow.previewFailed(new ApiError(503,'UNAVAILABLE','retry'));
  assert.equal(flow.previewKey('same input'),key);
  flow.previewFailed(new ApiError(410,'EXPIRED','expired'));
  const renewed=flow.previewKey('same input');
  assert.notEqual(renewed,key);
  assert.notEqual(flow.previewKey('changed input'),renewed);
  flow.cancel();
  assert.equal(flow.beginApply(),undefined);
  assert.notEqual(flow.previewKey('same input'),renewed);
});

void test('Apply preserves its receipt target/key across response loss and distinguishes confirmed rejection from a pending commit',()=>{
  const flow=new ProcessingSession();
  flow.acceptPreview('preview-1');
  const attempt=flow.beginApply();
  assert.equal(attempt?.id,'preview-1');
  assert.equal(flow.applyFailed(new NetworkError()),false);
  assert.deepEqual(flow.beginApply(),attempt);
  assert.equal(flow.applyFailed(new ApiError(409,'IDEMPOTENCY_PENDING','pending')),false);
  assert.equal(flow.applyFailed(new ApiError(409,'REQUEST_IN_PROGRESS','pending')),false);
  assert.equal(flow.applyFailed(new ApiError(409,'BASE_VERSION_STALE','stale')),true);
  assert.equal(flow.applyFailed(new PreviewRejected('expired')),true);
  flow.resetAttempt();
  assert.equal(flow.beginApply(),undefined);
});

void test('CSV service parses the complete source and applies a typed override without React',async()=>{
  const file=new File(['value;label\n001;first\n002;second\n'],'sample.csv');
  const bytes=await readImportSource(file);
  const result=previewImport(bytes,optionsFor(';',{0:'text'}));
  assert.equal(result.rows.length,2);
  assert.equal(result.columns[0].logicalType,'text');
  assert.equal(result.rows[0].cells[result.columns[0].columnId].value,'001');
  await assert.rejects(readImportSource({size:16_000_001} as File),/16.000.000/);
});

void test('project name policy counts Unicode code points consistently for create and rename',()=>{
  assert.equal(normalizeProjectName('  project  '),'project');
  assert.equal(normalizeProjectName('😀'.repeat(100)),'😀'.repeat(100));
  assert.throws(()=>normalizeProjectName('😀'.repeat(101)),/1–100/);
  assert.throws(()=>normalizeProjectName('  '),/1–100/);
});
