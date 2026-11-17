import test from 'node:test';
import assert from 'node:assert/strict';
import { draftMatches,workspaceDrafts,type WorkspaceDraft } from '../../src/features/projects/workspace-drafts';
import type { Workspace } from '../../src/features/projects/types';
const data=new Map<string,string>();let quota=false;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{get length(){return data.size;},key:(index:number)=>[...data.keys()][index]??null,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{if(quota)throw new DOMException('Full','QuotaExceededError');data.set(key,value);},removeItem:(key:string)=>data.delete(key)}});
const draft:WorkspaceDraft={schema:1,id:'tab1',userId:'u1',projectId:'p1',revision:0,boundVersionId:'v1',patch:{tableState:{page:1,pageSize:25,filters:[],sort:null}},updatedAt:'2026-11-16T00:00:00.000Z'};
void test('drafts isolate account/project/tab records and only remove the explicitly named draft',()=>{
  data.clear();workspaceDrafts.save(draft);workspaceDrafts.save({...draft,id:'tab2',patch:{activeTab:'history'}});workspaceDrafts.save({...draft,userId:'u2'});workspaceDrafts.save({...draft,projectId:'p2'});
  assert.equal(workspaceDrafts.list('u1','p1').length,2);assert.equal(workspaceDrafts.listAccount('u1').length,3);assert.equal(workspaceDrafts.list('u3','p1').length,0);
  workspaceDrafts.remove('u1','p1','tab1');assert.equal(workspaceDrafts.list('u1','p1')[0].id,'tab2');assert.equal(workspaceDrafts.list('u2','p1').length,1);
});
void test('quota failure leaves the previous draft, and malformed or future schemas are preserved rather than deleted',()=>{
  data.clear();workspaceDrafts.save(draft);quota=true;assert.throws(()=>workspaceDrafts.save({...draft,patch:{activeTab:'history'}}),{name:'QuotaExceededError'});quota=false;assert.deepEqual(workspaceDrafts.list('u1','p1')[0].patch,draft.patch);
  const key=[...data.keys()][0];data.set(key,'{"schema":2}');assert.throws(()=>workspaceDrafts.list('u1','p1'));assert.equal(data.get(key),'{"schema":2}');
  data.set(key,JSON.stringify({...draft,patch:{tableState:null}}));assert.throws(()=>workspaceDrafts.list('u1','p1'));assert.equal(data.size,1);
});
void test('response-loss reconciliation requires the same bound version and complete patched values, independent of object key order',()=>{
  const workspace:Workspace={_id:'w1',revision:1,updatedAt:'2026-11-16T00:00:00.000Z',activeTab:'collection',boundVersionId:'v1',tableState:{sort:null,filters:[],pageSize:25,page:1},selection:{columnIds:[],cell:null},chartConfig:{xColumnId:null,yColumnId:null,zColumnId:null,colorMode:'normal',outlierColumnIds:[],outlierMethod:'iqr',threshold:1.5}};
  assert.equal(draftMatches(workspace,draft),true);assert.equal(draftMatches({...workspace,boundVersionId:'v2'},draft),false);assert.equal(draftMatches({...workspace,tableState:{...workspace.tableState,pageSize:50}},draft),false);
});
