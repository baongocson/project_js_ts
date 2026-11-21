import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importCsv } from '@dashboard/data-core';
import { readLocalAnalytics,summarizeLocalProjects } from '../../src/features/offline/services/local-analytics';
import { projectStore,type LocalProject } from '../../src/features/offline/repositories/project-store';

function project(accountId?:string):LocalProject {
  let id=0;
  const snapshot=importCsv(new TextEncoder().encode('n,t\n1,a\n2,\n'),{delimiter:','},()=>String(++id));
  return {id:accountId??'guest',name:'fixture',accountId,fileName:'fixture.csv',source:new Uint8Array(),sourceHash:'fixture',original:snapshot,snapshot,engineVersion:'fixture',operations:[],createKey:'create',importKey:'import',cursor:0,status:'local'};
}
void test('dashboard counts all snapshot cells and returns zero counts for an empty library',()=>{
  const result=summarizeLocalProjects([project()]);
  assert.deepEqual({...result,types:[]},{projects:1,rows:2,versions:1,operations:0,cells:4,missing:1,types:[]});
  assert.equal(result.types.reduce((sum,[,count])=>sum+count,0),2);
  assert.equal(summarizeLocalProjects([]).cells,0);
});
void test('dashboard reads guest and current owner projects without exposing another account',async()=>{
  const original=projectStore.list;
  projectStore.list=()=>Promise.resolve([project(),project('owner'),project('other')]);
  try {
    assert.equal((await readLocalAnalytics('owner')).projects,2);
    assert.equal((await readLocalAnalytics()).projects,1);
  } finally {projectStore.list=original;}
});
