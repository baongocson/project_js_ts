import { describe,test,expect } from '@jest/globals';
import type { Snapshot } from '@dashboard/data-core';
import { analyzeCorrelation,analyzePoints3d } from '../../../../modules/analysis/analysis-calculations';

describe('analysis capacity within approved schema limits',()=>{
  test('1000-column Pearson matrix preserves dimensions, pair counts and symmetry',()=>{
    const columns=Array.from({length:1000},(_,i)=>({columnId:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name:String(i),position:i,logicalType:'number' as const,format:null,lineage:null}));
    const snapshot:Snapshot={columns,rows:Array.from({length:8},(_,i)=>({rowId:`r${i}`,position:i,cells:Object.fromEntries(columns.map(col=>[col.columnId,{kind:'number',value:i+col.position}]))}))};
    const result=analyzeCorrelation(snapshot,{method:'pearson'});
    expect(result.matrix).toHaveLength(1000);expect(result.matrix[999]).toHaveLength(1000);
    expect(result.matrix[0][999]).toBeCloseTo(1);expect(result.matrix[999][0]).toEqual(result.matrix[0][999]);expect(result.validPairCounts[0][999]).toBe(8);
  });
  test('50000-row stable sample has exact eligible/returned counts',()=>{
    const id='00000000-0000-4000-8000-000000000001';
    const snapshot:Snapshot={columns:[{columnId:id,name:'n',position:0,logicalType:'number',format:null,lineage:null}],rows:Array.from({length:50000},(_,i)=>({rowId:`r${i}`,position:i,cells:{[id]:{kind:'number',value:i}}}))};
    const result=analyzePoints3d(snapshot,{xColumnId:id,yColumnId:id,zColumnId:id,colorMode:'normal',outlierMethod:'iqr',threshold:1.5,maxPoints:100});
    expect(result.sampling).toEqual({applied:true,totalEligible:50000,returned:100,method:'stable-rowid'});expect(new Set(result.points.map(row=>row.rowId)).size).toBe(100);
  });
});
