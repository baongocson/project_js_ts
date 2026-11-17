import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_VERSION,importCsv,processSnapshot } from '@dashboard/data-core';
import { backupProject,parseProjectBackup,sourceHash } from '../../src/features/offline/project-backup';
import type { LocalProject } from '../../src/features/offline/project-store';
async function fixture():Promise<LocalProject>{
  const source=new TextEncoder().encode('n,t\n1,a\n2,b\n'),original=importCsv(source,{delimiter:','},()=>crypto.randomUUID());
  const specification={method:'uppercase' as const,scope:{type:'columns' as const,columnIds:[original.columns[1].columnId]},parameters:{},statisticsScope:{type:'whole-columns' as const}};
  const snapshot=processSnapshot(original,specification).snapshot;
  return {id:crypto.randomUUID(),name:'Backup fixture',fileName:'original.csv',source,sourceHash:await sourceHash(source),original,snapshot,engineVersion:ENGINE_VERSION,operations:[{id:crypto.randomUUID(),kind:'process',specification,snapshot,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),phase:'queued'}],createKey:crypto.randomUUID(),importKey:crypto.randomUUID(),cursor:0,status:'local'};
}
void test('backup preserves exact source, typed snapshots, history and stable keys and marks imported receipts for revalidation',async()=>{
  const project=await fixture(),copy=await parseProjectBackup(backupProject(project));
  assert.deepEqual(copy,{...project,restoredBackup:true});
  const legacy={...project,engineVersion:'previous-engine'};assert.equal((await parseProjectBackup(backupProject(legacy))).engineVersion,'previous-engine');
});
void test('missing source can be archived without discarding snapshots/history, but a wrong source hash is rejected',async()=>{
  const project=await fixture();project.source=new Uint8Array();const restored=await parseProjectBackup(backupProject(project));assert.equal(restored.source.byteLength,0);assert.deepEqual(restored.operations,project.operations);
  const encoded=JSON.parse(backupProject(await fixture()));encoded.sourceBase64=btoa('changed');await assert.rejects(parseProjectBackup(JSON.stringify(encoded)),/Backup không hợp lệ/);
});
void test('backup rejects unknown metadata, duplicate retry keys, corrupted typed snapshot and unsupported format without a storage write',async()=>{
  const original=JSON.parse(backupProject(await fixture()));
  for(const mutate of [
    (value:typeof original)=>{value.project.accessToken='must not import auth metadata';},
    (value:typeof original)=>{value.project.operations[0].applyKey=value.project.importKey;},
    (value:typeof original)=>{value.project.snapshot.rows[0].position=42;},
    (value:typeof original)=>{value.schema=999;},
    (value:typeof original)=>{const column=value.project.snapshot.columns[1].columnId;value.project.snapshot.rows[0].cells[column].value='changed current without history';},
  ]){const copy=structuredClone(original);mutate(copy);await assert.rejects(parseProjectBackup(JSON.stringify(copy)));}
});
