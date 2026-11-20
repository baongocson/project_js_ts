import test from 'node:test';
import assert from 'node:assert/strict';
import { scatterModel } from '../../src/features/analysis/scatter-model';
import { localAnalysis } from '../../src/features/analysis/services/analysis-service';
import { importCsv } from '@dashboard/data-core';

void test('points and axis ticks share one transform with full-version bounds, constant axes and extreme finite numbers',()=>{
  const point={rowId:'r',x:20,y:5,z:0,missingCount:0,isOutlier:false,outlierColumnIds:[]};
  const axes=[{columnId:'x',min:10,max:30},{columnId:'y',min:5,max:5},{columnId:'z',min:-1e308,max:1e308}];
  const model=scatterModel([point],axes);assert(model.points[0].position.every(value=>Math.abs(value)<1e-12));
  model.ticks[0].forEach((tick,index)=>assert(Math.abs(tick.position-(-4+index*2))<1e-12));assert.equal(model.ticks[0][2].value,point.x);assert.equal(model.ticks[1][0].position,model.points[0].position[1]);assert(model.ticks[2].every(t=>Number.isFinite(t.position)));
});
void test('global missing/outlier colors include non-axis columns, excluded coordinate rows and full bounds despite sampling',async()=>{
  let i=0;const data=importCsv(new TextEncoder().encode('x,y,z,other,label\n'+Array.from({length:120},(_,n)=>`${n===119?'':n},${n},${n},${n===118?1000:1},${n===117?'':'a'}`).join('\n')),{delimiter:','},()=>`id-${++i}`);
  const [x,y,z,other]=data.columns.map(c=>c.columnId),api=localAnalysis(data,'v',1);
  const query={xColumnId:x,yColumnId:y,zColumnId:z,outlierColumnIds:[x],colorMode:'outlier' as const,outlierMethod:'iqr' as const,threshold:1.5,maxPoints:100};
  const out=await api.points(query);assert.equal(out.flaggedCounts?.outlierRows,1);assert(out.points.some(p=>p.rowId===data.rows[118].rowId&&p.outlierColumnIds.includes(other)));assert.equal(out.axes?.[0].max,118);assert.equal(out.axes?.[1].max,119);
  const missing=await api.points({...query,colorMode:'missing'});assert(missing.points.some(p=>p.rowId===data.rows[117].rowId&&p.missingCount===1));assert.equal(missing.unplottablePoints?.[0].rowId,data.rows[119].rowId);assert.equal(missing.flaggedCounts?.missingRows,2);
  const dist=await api.distribution(other,{bins:20,outlierMethod:'zscore',threshold:3});assert.equal(dist.boxplot?.q1,1);assert.equal(dist.boxplot?.median,1);assert.equal(dist.boxplot?.q3,1);assert.equal(dist.boxplot?.upperWhisker,1);assert.equal(dist.boxplot?.outliers[0].value,1000);assert.equal(dist.boxplot?.outlierCount,1);
});
