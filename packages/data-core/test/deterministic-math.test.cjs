const test=require('node:test');
const assert=require('node:assert/strict');
const {deterministicLog1p}=require('../dist/deterministic-math.js');
test('deterministic log1p covers cancellation, near-domain boundary and large safe finite values',()=>{
  for(const x of [-1+Number.EPSILON,-0.99,-0.5,-0.49,-1e-12,-Number.MIN_VALUE,Number.MIN_VALUE,1e-300,1e-12,0.49,1,2,100,Number.MAX_SAFE_INTEGER]){
    const actual=deterministicLog1p(x),expected=Math.log1p(x);
    assert.ok(Number.isFinite(actual));
    assert.ok(Math.abs(actual-expected)<=4*Number.EPSILON*Math.max(Math.abs(expected),Number.MIN_VALUE),String(x));
  }
  assert.ok(Object.is(deterministicLog1p(-0),-0));assert.ok(Number.isNaN(deterministicLog1p(-1)));
});
