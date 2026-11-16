import { describe,test,expect,jest } from '@jest/globals';
import { AnalysisService } from '../../../../modules/analysis/analysis.service';
import type { Snapshot } from '@dashboard/data-core';
const id='00000000-0000-4000-8000-000000000001';
const empty:Snapshot={columns:[{columnId:id,name:'Score',position:0,logicalType:'number',format:null,lineage:null}],rows:[]};
const principal={userId:'a',sessionId:'b'};
describe('AnalysisService boundary',()=>{
  test('authorizes owner and published version before reading snapshot',async()=>{
    const calls:string[]=[];
    const ownership={dataset:async()=>{calls.push('owner');},version:async()=>{calls.push('version');}};
    const repository={load:async()=>{calls.push('load');return {snapshot:empty,originalByteSize:7};}};
    const service=new AnalysisService(ownership as never,repository as never);
    const res=await service.summary(principal as never,'dataset','version',{outlierMethod:'iqr',outlierThreshold:1.5});
    expect(calls).toEqual(['owner','version','load']);expect(res.originalByteSize).toBe(7);
  });
  test('does not load data if owner check fails',async()=>{
    const repository={load:jest.fn()};
    const service=new AnalysisService({dataset:async()=>{throw new Error('forbidden');}} as never,repository as never);
    await expect(service.summary(principal as never,'dataset','version',{outlierMethod:'iqr',outlierThreshold:1.5})).rejects.toThrow('forbidden');
    expect(repository.load).not.toHaveBeenCalled();
  });
  test('rejects nonnumeric axis and duplicate outlier selection',async()=>{
    const nonnumeric={...empty,columns:[{...empty.columns[0],logicalType:'text' as const}]};
    const service=new AnalysisService({dataset:async()=>{},version:async()=>{}} as never,{load:async()=>({snapshot:nonnumeric,originalByteSize:0})} as never);
    await expect(service.points3d(principal as never,'d','v',{xColumnId:id,yColumnId:id,zColumnId:id,colorMode:'normal',outlierMethod:'iqr',threshold:1.5,maxPoints:10})).rejects.toThrow();
    await expect(service.summary(principal as never,'d','v',{outlierMethod:'iqr',outlierThreshold:1.5,outlierColumnIds:[id,id]})).rejects.toThrow();
  });
});
