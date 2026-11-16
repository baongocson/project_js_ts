import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from '../../../../infrastructure/database/database.connection';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processSnapshot, type ProcessingSpecification, type Snapshot } from '@dashboard/data-core';
import { createTestApp, record } from '../../../utils';
import { DatasetsRepository } from '../../../../modules/datasets/datasets.repository';
import { AccountCleanupService } from '../../../../infrastructure/database/account-cleanup.service';
import { ProcessingRecoveryService } from '../../../../modules/processing/processing-recovery.service';
import { ImportRecoveryService } from '../../../../modules/datasets/import-recovery.service';
import { SnapshotPublisherService } from '../../../../modules/datasets/snapshot-publisher.service';
import { parseCreatePreview } from '../../../../modules/processing/dto/processing.validation';

type Fixture = { method: string; csv: string; parameters: Record<string, unknown>; column?: number; cell?: boolean; dataset?: boolean };
const fixtures = JSON.parse(readFileSync(resolve(PROJECT_ROOT,'packages/data-core/fixtures/processing-acceptance.json'),'utf8')) as Fixture[];
const numeric='n,t\n1,a\n2,b\n100,c\n,N/A\n';

jest.setTimeout(120_000);
describe('27-method HTTP + MongoDB acceptance matrix and lifecycle recovery',()=>{
  let fixture:Awaited<ReturnType<typeof createTestApp>>, connection:Connection, token:string, root:string;
  const email=`matrix-${randomUUID()}@example.com`;
  const previousRoot=process.env.ORIGINAL_STORAGE_ROOT;
  beforeAll(async()=>{
    root=await mkdtemp(join(tmpdir(),'method-matrix-')); process.env.ORIGINAL_STORAGE_ROOT=root;
    fixture=await createTestApp(true); connection=fixture.app.get<Connection>(getConnectionToken());
    const origin=fixture.app.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN').split(',')[0];
    await request(fixture.server).post('/api/v1/auth/register').set('Origin',origin).send({email,password:'matrix-password-123'}).expect(201);
    token=String(record((await request(fixture.server).post('/api/v1/auth/login').set('Origin',origin).send({email,password:'matrix-password-123'}).expect(200)).body).accessToken);
  });
  afterAll(async()=>{
    jest.restoreAllMocks();
    try {
      if(connection?.db){const user=await connection.db.collection('users').findOne({emailNormalized:email});if(user){const cleanup=fixture.app.get(AccountCleanupService);await cleanup.markUserDeleting(user._id);await cleanup.removeUser(user._id);}}
    } finally {await fixture?.close();if(previousRoot===undefined)delete process.env.ORIGINAL_STORAGE_ROOT;else process.env.ORIGINAL_STORAGE_ROOT=previousRoot;if(root)await rm(root,{recursive:true,force:true});}
  });
  const auth=()=>`Bearer ${token}`;
  async function imported(csv:string){
    const project=record(record((await request(fixture.server).post('/api/v1/projects').set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({name:'matrix'}).expect(201)).body).project);
    const result=record((await request(fixture.server).post(`/api/v1/projects/${String(project._id)}/datasets`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).field('importOptions','{}').attach('file',Buffer.from(csv),'matrix.csv').expect(201)).body);
    const datasetId=String(record(result.dataset)._id),versionId=String(record(result.version)._id);
    const snapshot=await fixture.app.get(DatasetsRepository).snapshot(datasetId,versionId);
    return {projectId:String(project._id),datasetId,versionId,snapshot};
  }
  function specification(item:Fixture,snapshot:Snapshot):Record<string,unknown>{
    const columnId=snapshot.columns[item.column??0].columnId;
    const raw={method:item.method,parameters:item.parameters,scope:item.dataset?{type:'dataset'}:item.cell?{type:'cell',rowId:snapshot.rows[0]?.rowId??randomUUID(),columnId}:{type:'columns',columnIds:[columnId]}};
    return parseCreatePreview({baseVersionId:'0123456789abcdef01234567',specification:raw}).specification as unknown as Record<string,unknown>;
  }
  const preview=(datasetId:string,versionId:string,spec:Record<string,unknown>)=>request(fixture.server).post(`/api/v1/datasets/${datasetId}/previews`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({baseVersionId:versionId,specification:spec});
  it.each(fixtures)('$method: HTTP candidate/apply equals shared-core output; invalid parameters do not publish',async item=>{
    const {datasetId,versionId,snapshot}=await imported(item.csv);
    const spec=specification(item,snapshot);
    const created=record((await preview(datasetId,versionId,spec).expect(201)).body);
    expect(created.status).toBe('ready'); expect(created.canApply).toBe(true);
    const expected=processSnapshot(snapshot,{...spec,statisticsScope:{type:'whole-columns'}} as ProcessingSpecification);
    expect(expected.errors).toEqual([]);
    const applied=record((await request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}).expect(201)).body);
    const head=String(record(applied.dataset).currentVersionId);
    const actual=await fixture.app.get(DatasetsRepository).snapshot(datasetId,head);
    expect(actual).toEqual(expected.snapshot);
    expect(await fixture.app.get(DatasetsRepository).snapshot(datasetId,versionId)).toEqual(snapshot);
    await preview(datasetId,head,{...spec,parameters:{...item.parameters,unsupported:true}}).expect(400);
    expect(await connection.db!.collection('processingOperations').countDocuments({datasetId:new Types.ObjectId(datasetId),kind:'process'})).toBe(1);
    if(['one_hot','drop_missing_columns'].includes(item.method))expect(record(created.summary).updatedCellCount).toBe(0);
  });
  it.each(fixtures)('$method: header-only boundary is invalid/no-op or schema-only, never fabricated row data',async item=>{
    const {datasetId,versionId,snapshot}=await imported('n,t\n');
    const spec=specification(item,snapshot);
    const created=record((await preview(datasetId,versionId,spec).expect(201)).body);
    const expected=processSnapshot(snapshot,{...spec,statisticsScope:{type:'whole-columns'}} as ProcessingSpecification);
    expect(created.status).toBe(expected.errors.length?'invalid':'ready');
    expect(created.canApply).toBe(expected.canApply);
    expect(record(record(created.summary).after).rowCount).toBe(0);
    expect(await connection.db!.collection('processingOperations').countDocuments({datasetId:new Types.ObjectId(datasetId),kind:'process'})).toBe(0);
  });
  it('returns LAST_COLUMN and HTTP 413 for the two documented processing limits',async()=>{
    const {datasetId,versionId,snapshot}=await imported('n\nN/A\n');
    const result=record((await preview(datasetId,versionId,{method:'drop_missing_columns',parameters:{},scope:{type:'dataset'}}).expect(201)).body);
    expect(record((record(result.diagnostics).errors as unknown[])[0]).code).toBe('LAST_COLUMN');
    await preview(datasetId,versionId,{method:'ordinal',parameters:{mapping:Array.from({length:5001},(_,i)=>({value:{kind:'text',value:String(i)},label:i}))},scope:{type:'columns',columnIds:[snapshot.columns[0].columnId]}}).expect(413);
  });
  it('expires with 410, purges with 404 and recovers abandoned candidates without deleting published data',async()=>{
    const {datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body);
    const id=new Types.ObjectId(String(created.previewId));
    await connection.db!.collection('processingPreviews').updateOne({_id:id},{$set:{expiresAt:new Date(Date.now()-1)}});
    await request(fixture.server).get(`/api/v1/datasets/${datasetId}/previews/${String(created.previewId)}`).set('Authorization',auth()).expect(410);
    const [expiredApply]=await Promise.all([
      request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}),
      fixture.app.get(ProcessingRecoveryService).recover(),
    ]);
    expect([404,410]).toContain(expiredApply.status);
    await request(fixture.server).get(`/api/v1/datasets/${datasetId}/previews/${String(created.previewId)}`).set('Authorization',auth()).expect(404);
    await connection.db!.collection('datasetVersions').updateOne({_id:new Types.ObjectId(String(created.candidateVersionId))},{$set:{createdAt:new Date(0)}});
    await fixture.app.get(ImportRecoveryService).recover();
    expect(await connection.db!.collection('datasetVersions').findOne({_id:new Types.ObjectId(String(created.candidateVersionId))})).toBeNull();
    expect(await fixture.app.get(DatasetsRepository).snapshot(datasetId,versionId)).toEqual(snapshot);
  });
  it('resumes after a publish participant fails without creating duplicate history',async()=>{
    const {datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body);
    const spy=jest.spyOn(fixture.app.get(SnapshotPublisherService),'publish').mockRejectedValueOnce(new Error('simulated worker failure'));
    const key=randomUUID();
    const apply=()=>request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',key).send({previewId:created.previewId});
    expect((await apply()).status).toBeGreaterThanOrEqual(500);spy.mockRestore();
    await connection.db!.collection('idempotencyRecords').updateMany({actionScope:`v1.datasets.${datasetId}.operations.apply`,status:'pending'},{$set:{leaseUntil:new Date(0)}});
    await apply().expect(201);await apply().expect(201);
    expect(await connection.db!.collection('processingOperations').countDocuments({datasetId:new Types.ObjectId(datasetId),kind:'process'})).toBe(1);
  });
  it('rejects wrong/unpublished restore targets and publishes only one concurrent restore',async()=>{
    const {datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body);
    const restore=(target:string,current:string)=>request(fixture.server).post(`/api/v1/datasets/${datasetId}/versions/${target}/restore`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({expectedCurrentVersionId:current});
    await restore(String(created.candidateVersionId),versionId).expect(404);
    await restore(new Types.ObjectId().toHexString(),versionId).expect(404);
    const applied=record((await request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}).expect(201)).body);
    const head=String(record(applied.dataset).currentVersionId);
    const responses=await Promise.all([restore(versionId,head),restore(versionId,head)]);
    expect(responses.filter(response=>response.status===201)).toHaveLength(1);
    expect(responses.filter(response=>response.status!==201).every(response=>[409,503].includes(response.status))).toBe(true);
    expect(await connection.db!.collection('processingOperations').countDocuments({datasetId:new Types.ObjectId(datasetId),kind:'restore'})).toBe(1);
  });
  it('delete racing Apply cannot leave a published version or orphan operation',async()=>{
    const {projectId,datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body);
    const [applied,deleted]=await Promise.all([
      request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}),
      request(fixture.server).delete(`/api/v1/projects/${projectId}`).set('Authorization',auth()),
    ]);
    expect(deleted.status).toBe(204);expect([201,404,409,503]).toContain(applied.status);
    for(const collection of ['datasetVersions','processingOperations','processingPreviews'])expect(await connection.db!.collection(collection).countDocuments({datasetId:new Types.ObjectId(datasetId)})).toBe(0);
    await request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}).expect(404);
  });
  it('replays the committed Apply receipt after preview purge and never removes its published candidate',async()=>{
    const {datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body),key=randomUUID();
    const apply=()=>request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',key).send({previewId:created.previewId});
    const first=await apply().expect(201);
    await connection.db!.collection('processingPreviews').updateOne({_id:new Types.ObjectId(String(created.previewId))},{$set:{expiresAt:new Date(0)}});
    await fixture.app.get(ProcessingRecoveryService).recover();await fixture.app.get(ImportRecoveryService).recover();
    expect((await apply().expect(201)).body).toEqual(first.body);
    expect(await connection.db!.collection('datasetVersions').findOne({_id:new Types.ObjectId(String(created.candidateVersionId)),state:'published'})).not.toBeNull();
  });
  it('paginates 12000 change records and safely returns an empty extremely distant page',async()=>{
    const {datasetId,versionId,snapshot}=await imported('n,t\n'+Array.from({length:12000},(_,i)=>`${i},a`).join('\n')+'\n');
    const created=record((await preview(datasetId,versionId,{method:'uppercase',parameters:{},scope:{type:'columns',columnIds:[snapshot.columns[1].columnId]}}).expect(201)).body);
    const url=`/api/v1/datasets/${datasetId}/previews/${String(created.previewId)}`;
    const first=record((await request(fixture.server).get(url).set('Authorization',auth()).query({page:1,limit:100}).expect(200)).body);
    const last=record((await request(fixture.server).get(url).set('Authorization',auth()).query({page:120,limit:100}).expect(200)).body);
    expect(first.totalChanges).toBe(12000);expect((last.changes as unknown[]).length).toBe(100);
    expect(record((first.changes as unknown[])[0]).ordinal).toBe(0);expect(record((last.changes as unknown[])[99]).ordinal).toBe(11999);
    const distant=record((await request(fixture.server).get(url).set('Authorization',auth()).query({page:Number.MAX_SAFE_INTEGER,limit:100}).expect(200)).body);
    expect(distant.changes).toEqual([]);
  });
  it('account delete racing Apply invalidates the session and removes the complete dataset graph',async()=>{
    const {datasetId,versionId,snapshot}=await imported(numeric);
    const created=record((await preview(datasetId,versionId,specification(fixtures[0],snapshot)).expect(201)).body);
    const [applied,deleted]=await Promise.all([
      request(fixture.server).post(`/api/v1/datasets/${datasetId}/operations`).set('Authorization',auth()).set('Idempotency-Key',randomUUID()).send({previewId:created.previewId}),
      request(fixture.server).delete('/api/v1/users/me').set('Authorization',auth()),
    ]);
    expect(deleted.status).toBe(204);expect([201,401,404,409,503]).toContain(applied.status);
    for(const collection of ['datasetVersions','processingOperations','processingPreviews'])expect(await connection.db!.collection(collection).countDocuments({datasetId:new Types.ObjectId(datasetId)})).toBe(0);
    await request(fixture.server).get('/api/v1/users/me').set('Authorization',auth()).expect(401);
  });
});
