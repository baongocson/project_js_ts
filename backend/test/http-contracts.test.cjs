const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');

test('all 27 declared business routes validate DTOs and remain explicitly unimplemented',async(t)=>{
 const port=Number(process.env.CONTRACT_TEST_PORT||3197);
 const child=spawn(process.execPath,['dist/main.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATABASE_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
 t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}});
 let ready=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error('Backend failed to start: '+output);
  if(output.includes('successfully started')){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.equal(ready,true,'Backend startup timed out');
 const base='http://127.0.0.1:'+port+'/api/v1/';
 const id='0123456789abcdef01234567',uuid='00000000-0000-4000-8000-000000000001';
 const root='datasets/'+id+'/versions/'+id;
 const cases=[
 ['POST','auth/register',{email:'a@example.com',password:'abcdefghijkl'}],['POST','auth/login',{email:'a@example.com',password:'x'}],['POST','auth/refresh',{}],['POST','auth/logout',{}],
 ['GET','users/me'],['PATCH','users/me',{displayName:null}],['DELETE','users/me'],
 ['POST','projects',{name:'Project'}],['GET','projects?sort=name'],['GET','projects/'+id],['PATCH','projects/'+id,{name:'Renamed'}],['PATCH','projects/'+id+'/workspace',{revision:1,boundVersionId:null,tableState:{page:1}}],['DELETE','projects/'+id],
 ['POST','projects/'+id+'/datasets',{importOptions:{}}],['GET',root],['GET',root+'/rows'],['GET',root+'/rows/'+uuid],
 ['GET',root+'/analysis/summary'],['GET',root+'/analysis/columns/'+uuid+'/distribution'],['GET',root+'/analysis/correlation'],['GET',root+'/analysis/points-3d?xColumnId='+uuid+'&yColumnId='+uuid+'&zColumnId='+uuid],['GET',root+'/analysis/columns/'+uuid+'/value-counts'],
 ['POST','datasets/'+id+'/previews',{baseVersionId:id,specification:{method:'edit_cell',parameters:{value:{kind:'null',value:null}},scope:{type:'cell',rowId:uuid,columnId:uuid}}}],['GET','datasets/'+id+'/previews/'+id],['POST','datasets/'+id+'/operations',{previewId:id}],
 ['GET','datasets/'+id+'/operations'],['POST',root+'/restore',{expectedCurrentVersionId:id}],
 ];
 assert.equal(cases.length,27);
 for(const [method,route,body]of cases){await t.test(method+' '+route,async()=>{
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','Idempotency-Key':'test-key'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const json=await response.json();assert.equal(response.status,501,JSON.stringify(json));assert.equal(json.error.code,'NOT_IMPLEMENTED');assert.equal(typeof json.error.message,'string');
 });}
 const invalid=[
 ['POST','auth/register',{email:'tên@example.com',password:'abcdefghijkl'},'VALIDATION_ERROR'],
 ['PATCH','users/me',{preferences:{}},'EMPTY_PATCH'],
 ['PATCH','projects/'+id+'/workspace',{revision:1,boundVersionId:null},'EMPTY_PATCH'],
 ['POST','datasets/'+id+'/operations',{previewId:id,parameters:{}},'VALIDATION_ERROR'],
 ['GET','projects?page=1&page=2',undefined,'VALIDATION_ERROR'],
 ['GET','users/me?unexpected=1',undefined,'VALIDATION_ERROR'],
 ['POST','projects?unexpected=1',{name:'Project'},'VALIDATION_ERROR'],
 ['GET',root+'/analysis/summary?threshold=3',undefined,'VALIDATION_ERROR'],
 ['GET',root+'/analysis/correlation?method=category',undefined,'VALIDATION_ERROR'],
 ];
 for(const [method,route,body,code]of invalid){await t.test('reject '+method+' '+route,async()=>{
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','Idempotency-Key':'test-key'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const json=await response.json();assert.equal(response.status,400,JSON.stringify(json));assert.equal(json.error.code,code);assert.equal(typeof json.error.message,'string');
 });}
 await t.test('mutation requires idempotency header',async()=>{
  const response=await fetch(base+'projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Project'})});assert.equal(response.status,400);
 });
});
