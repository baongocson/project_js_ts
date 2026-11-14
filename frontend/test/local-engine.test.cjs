const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, previewTransform, createProject, publishVersion, restoreVersion, activeVersion } = require('../.artifact-work/model.js');
test('Quoted CSV fields and doubled quotes', () => {
 const table = parseCsv('id,name\n1,"A, B"\n2,"a""b"');
 assert.deepEqual(table.rows, [['1','A, B'],['2','a"b']]);
});
test('Malformed CSV rejects bad field count', () => assert.throws(() => parseCsv('a,b\n1'), /Dòng 2/));
test('Preview does not mutate original version', () => {
 const original = parseCsv('x,y\n1,\n2, N/A\n3,ok');
 const preview = previewTransform(original, {kind:'fill',column:1,value:'0'});
 assert.equal(preview.changed, 2);
 assert.equal(preview.after.rows[0][1], '0');
 assert.equal(original.rows[0][1], '');
});
test('Trim only targeted column', () => {
 const result = previewTransform(parseCsv('x,y\n" A "," B "'),{kind:'trim',column:0});
 assert.deepEqual(result.after.rows[0], ['A',' B ']);
});
test('Restore creates a new version and preserves history', () => {
 let project = createProject('test', parseCsv('x\n1'));
 const targetId = project.currentVersionId;
 project = publishVersion(project, parseCsv('x\n2'), 'edit');
 project = restoreVersion(project,targetId);
 assert.equal(project.versions.length,3);
 assert.equal(activeVersion(project).number,3);
 assert.equal(activeVersion(project).table.rows[0][0],'1');
 assert.equal(project.versions[1].table.rows[0][0],'2');
});

test('CSV one-column dataset can be parsed without assuming three axes', () => {
 const table = parseCsv('value\n1\n2');
 assert.equal(table.columns.length,1);
 assert.equal(table.rows.length,2);
});
test('CSV rejects duplicate headers', () => assert.throws(() => parseCsv('x,x\n1,2'), /duy nhất/));
test('Local versions are unsynchronized and keep immutable prior values', () => {
 let project = createProject('persist',parseCsv('a,b\n1, 2'));
 const before = JSON.stringify(project.versions[0]);
 const changed = previewTransform(activeVersion(project).table,{kind:'trim',column:1});
 project = publishVersion(project, changed.after, 'trim');
 assert.equal(project.pendingSync,true);
 assert.equal(JSON.stringify(project.versions[0]),before);
 assert.equal(project.versions[1].table.rows[0][1],'2');
});
