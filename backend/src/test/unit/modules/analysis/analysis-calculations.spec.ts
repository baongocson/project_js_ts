import { describe, test, expect } from '@jest/globals';
import type { Snapshot, Cell } from '@dashboard/data-core';
import { analyzeSummary, analyzeDistribution, analyzeCorrelation, analyzePoints3d, analyzeValueCounts } from '../../../../modules/analysis/analysis-calculations';

const x='00000000-0000-4000-8000-000000000001';
const y='00000000-0000-4000-8000-000000000002';
const text='00000000-0000-4000-8000-000000000003';
const N=(value:number):Cell=>({kind:'number',value});
const T=(value:string):Cell=>({kind:'text',value});
function snapshot(rows:{x:Cell;y:Cell;t:Cell}[]):Snapshot {
  return {columns:[{columnId:x,name:'X',position:0,logicalType:'number',format:null,lineage:null},{columnId:y,name:'Y',position:1,logicalType:'number',format:null,lineage:null},{columnId:text,name:'Text',position:2,logicalType:'text',format:null,lineage:null}],
    rows:rows.map((value,i)=>({rowId:`00000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`,position:i,cells:{[x]:value.x,[y]:value.y,[text]:value.t}}))};
}
const example=snapshot([{x:N(1),y:N(2),t:T('A')},{x:N(2),y:N(4),t:T('A')},{x:N(3),y:N(6),t:T('B')},{x:N(3),y:N(6),t:T('B')},{x:T('N/A'),y:N(8),t:T(' ')}]);

describe('Analysis pure calculations',()=>{
  test('summary counts exact missing tokens and typed duplicates without mutating snapshot',()=>{
    const before=JSON.stringify(example);
    const response=analyzeSummary(example,'version',16,{outlierMethod:'iqr',outlierThreshold:1.5});
    expect(response).toMatchObject({originalByteSize:16,rowCount:5,columnCount:3,missingCount:2,duplicateRowCount:1});
    expect(response.missingRate).toBeCloseTo(2/15);
    expect(JSON.stringify(example)).toBe(before);
  });
  test('summary zero rows returns null rates',()=>{
    const r=analyzeSummary(snapshot([]),'v',0,{outlierMethod:'iqr',outlierThreshold:1.5});
    expect(r.missingRate).toBeNull();expect(r.missingByColumn.map(c=>c.rate)).toEqual([null,null,null]);
  });
  test('histogram uses exclusive upper except final bin; constant and missing are distinguished',()=>{
    const r=analyzeDistribution(example,example.columns[0],{bins:2,outlierMethod:'iqr',threshold:1.5});
    expect(r.histogram.map(bin=>bin.count)).toEqual([1,3]);
    expect(r.missingCount).toBe(1);
    const constant=snapshot([{x:N(1),y:N(2),t:T('ok')}]);
    expect(analyzeDistribution(constant,constant.columns[0],{bins:4,outlierMethod:'iqr',threshold:1.5}).histogramStatus).toBe('constant_column');
    expect(analyzeDistribution(example,example.columns[2],{bins:4,outlierMethod:'iqr',threshold:1.5}).histogramStatus).toBe('not_applicable');
  });
  test('Pearson is pairwise complete, symmetric and N/A for text or constant columns',()=>{
    const r=analyzeCorrelation(example,{method:'pearson'});
    expect(r.matrix[0][1]).toBeCloseTo(1);
    expect(r.matrix[1][0]).toBeCloseTo(1);
    expect(r.validPairCounts[0][1]).toBe(4);
    expect(r.matrix[0][2]).toBeNull();
    expect(r.naReasons.some(n=>n.reason==='non_numeric')).toBe(true);
    const constant=snapshot([{x:N(2),y:N(1),t:T('A')},{x:N(2),y:N(2),t:T('B')}]);
    expect(analyzeCorrelation(constant,{method:'pearson'}).matrix[0][1]).toBeNull();
  });
  test('3d stable-rowid sample is independent of row order; missing coords hidden',()=>{
    const q={xColumnId:x,yColumnId:y,zColumnId:x,colorMode:'normal' as const,outlierMethod:'iqr' as const,threshold:1.5,maxPoints:2};
    const a=analyzePoints3d(example,q), b=analyzePoints3d({...example,rows:[...example.rows].reverse()},q);
    expect(a.hiddenMissingCoordsCount).toBe(1);
    expect(a.sampling).toEqual({applied:true,totalEligible:4,returned:2,method:'stable-rowid'});
    expect(a.points.map(p=>p.rowId)).toEqual(b.points.map(p=>p.rowId));
  });
  test('value counts separates missing, uses total rows as rate denominator and paginates',()=>{
    const r=analyzeValueCounts(example,text,{page:1,limit:2,sort:'-count',includeMissing:true});
    expect(r.totalCategories).toBe(3);expect(r.totalPages).toBe(2);expect(r.missingCount).toBe(1);
    expect(r.items[0].count).toBe(2);expect(r.items[0].rate).toBe(0.4);
    const page2=analyzeValueCounts(example,text,{page:2,limit:2,sort:'-count',includeMissing:true});
    expect(page2.items).toHaveLength(1);expect(page2.items[0].isMissing).toBe(true);
    expect(analyzeValueCounts(example,text,{page:1,limit:10,sort:'value',includeMissing:false}).totalCategories).toBe(2);
  });
  test('large numeric column distribution does not use unsafe spread of argument list',()=>{
    const large=snapshot(Array.from({length:80000},(_,i)=>({x:N(i),y:N(i),t:T('A')})));
    const r=analyzeDistribution(large,large.columns[0],{bins:10,outlierMethod:'iqr',threshold:1.5});
    expect(r.histogram.reduce((sum,b)=>sum+b.count,0)).toBe(80000);
  });
});
