import test from 'node:test';
import assert from 'node:assert/strict';
import { configureAuthTransport } from '../../src/shared/api/http-client';
import { ProjectApi } from '../../src/features/offline/project-sync';
import { SyncHttpError } from '../../src/features/offline/types';
void test('the entire sync API sequence remains pinned to its authenticated owner across separate requests',async()=>{
  let owner='owner-a',requests=0;
  configureAuthTransport({token:()=>owner,owner:()=>owner,refresh:()=>Promise.resolve()});
  globalThis.fetch=async()=>{requests++;return Response.json({_id:'owner-a'});};
  const api=new ProjectApi(()=>owner);await api.request('users/me');api.bindOwner('owner-a');
  owner='owner-b';
  await assert.rejects(api.post('projects',{name:'must not create for account B'},'fixed-key'),error=>error instanceof SyncHttpError&&error.code==='ACCOUNT_MISMATCH');
  assert.equal(requests,1);assert.throws(()=>api.bindOwner('owner-b'),/Tài khoản đã đổi/);
});
void test('sync errors retain Retry-After so the coordinator can honor server backoff',async()=>{
  configureAuthTransport({token:()=>null,owner:()=>null,refresh:()=>Promise.resolve()});
  globalThis.fetch=()=>Promise.resolve(Response.json({error:{code:'RATE_LIMITED',message:'Wait'}},{status:429,headers:{'Retry-After':'7'}}));
  await assert.rejects(new ProjectApi(()=>'').request('users/me'),error=>error instanceof SyncHttpError&&error.retryAfter===7000);
});
