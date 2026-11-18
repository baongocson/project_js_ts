import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scatterColors } from '../../src/features/analysis/scatter-colors';
import type { ScatterPoint } from '../../src/features/analysis/types';

const point = (x:number, extra:Partial<ScatterPoint> = {}):ScatterPoint => ({rowId:String(x),x,y:x,z:x,missingCount:0,isOutlier:false,outlierColumnIds:[],...extra});
void test('numeric display color uses full bounds, clamps extremes, and keeps a constant axis centered',()=>{
  const points=[point(0),point(50),point(100)];
  const colors=scatterColors(points,undefined,'normal','x',true);
  assert.equal(colors.color(points[0]),colors.palette.low);assert.equal(colors.color(points[1]),colors.palette.mid);assert.equal(colors.color(points[2]),colors.palette.high);
  assert.equal(colors.color(point(-100)),colors.palette.low);
  const bounded=scatterColors([point(50)],[{columnId:'x',min:0,max:100},{columnId:'y',min:0,max:100},{columnId:'z',min:0,max:100}],'normal','x',true);
  assert.deepEqual(bounded.range,[0,100]);assert.equal(bounded.color(point(50)),bounded.palette.mid);
  const constant=scatterColors([point(5)],undefined,'normal','x',false);
  assert.equal(constant.color(point(5)),constant.palette.mid);
  const extreme=scatterColors([point(-Number.MAX_VALUE),point(Number.MAX_VALUE)],undefined,'normal','x',true);
  assert.equal(extreme.color(point(0)),extreme.palette.mid);
  assert.equal(scatterColors([],undefined,'normal','x',true).range,undefined);
});
void test('shared semantic colors preserve flags, selected priority, and distinct theme palettes',()=>{
  for(const dark of [false,true]){
    const missing=scatterColors([],undefined,'missing','none',dark),outlier=scatterColors([],undefined,'outlier','none',dark);
    assert.equal(missing.color(point(1,{missingCount:2})),missing.palette.missing);
    assert.equal(outlier.color(point(1,{isOutlier:true})),outlier.palette.outlier);
    assert.equal(outlier.color(point(1,{isOutlier:true}),true),outlier.palette.selected);
    assert.notEqual(outlier.palette.selected,outlier.palette.normal);
  }
});
