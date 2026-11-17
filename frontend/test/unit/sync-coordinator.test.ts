import test from 'node:test';
import assert from 'node:assert/strict';
Object.defineProperty(globalThis,'BroadcastChannel',{value:undefined,configurable:true});
const {autoEligible,MAX_AUTO_ATTEMPTS,retryDelay}=await import('../../src/features/offline/sync-coordinator');
import type { LocalProject } from '../../src/features/offline/project-store';
void test('auto replay requires explicit opt-in, exact bound owner, pending work and bounded retry eligibility',()=>{
  const project={autoSync:true,accountId:'owner',datasetId:'dataset',cursor:0,operations:[{}],status:'local'} as unknown as LocalProject;
  assert.equal(autoEligible(project,'owner'),true);
  for(const change of [{autoSync:false},{accountId:undefined},{accountId:'other'},{status:'conflict'},{status:'blocked'},{cursor:1},{syncRetry:{attempt:MAX_AUTO_ATTEMPTS,nextAt:0}}])assert.equal(autoEligible({...project,...change} as LocalProject,'owner'),false);
  assert.deepEqual([1,2,3,4,5].map(retryDelay),[2000,4000,8000,16000,32000]);assert.equal(retryDelay(100),60000);
});
