const { test } = require('node:test');
const assert = require('node:assert/strict');
const commonjs = require('../dist');
test('ESM browser entry and CommonJS backend entry use the same parser and codec', async () => {
  const esm = await import('../dist/esm/index.js');
  const bytes = new TextEncoder().encode('x,y\n001,true\nN/A,false');
  const idFactory = () => { let next = 0; return () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`; };
  const offline = esm.importCsv(bytes, { delimiter: ',' }, idFactory());
  const online = commonjs.importCsv(bytes, { delimiter: ',' }, idFactory());
  assert.deepEqual(offline, online);
  assert.deepEqual(esm.decodeSnapshot(commonjs.encodeSnapshot(online), offline.columns), offline);
});
