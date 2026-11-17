// HTTPS acceptance against an isolated replica. Never reads the application's URI.
const { MongoMemoryReplSet }=require('mongodb-memory-server');
const { createConnection }=require('mongoose');
const { randomBytes,randomUUID,createHash,X509Certificate }=require('node:crypto');
const { mkdtemp,readFile,rm }=require('node:fs/promises');
const { tmpdir }=require('node:os');
const { resolve,join,extname,relative,isAbsolute,sep }=require('node:path');
const { createServer }=require('node:https');
const { request:httpRequest }=require('node:http');
const { createServer:createProbe }=require('node:net');
const { spawn,spawnSync }=require('node:child_process');
const { provisionDatabase,verifyDatabase }=require('../dist/infrastructure/database/database.provision');
const backend=resolve(__dirname,'..'),frontend=resolve(backend,'../frontend'),base='https://127.0.0.1:4174';
const completion=child=>new Promise((resolveResult,reject)=>{child.once('error',reject);child.once('exit',code=>resolveResult(code??1));});
async function main(){
  const root=await mkdtemp(join(tmpdir(),'dashboard-browser-'));let replica,connection,api,server;
  try{
    // Refuse occupied ports before starting; never accidentally target a user's API.
    for(const port of [4174,4310])await new Promise((ready,reject)=>{
      const probe=createProbe();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(ready));
    });
    const cert=join(root,'cert.pem'),key=join(root,'key.pem');
    const generated=spawnSync(process.env.OPENSSL_BIN||'openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'pipe',windowsHide:true});
    if(generated.error||generated.status!==0)throw new Error('OpenSSL required; set OPENSSL_BIN if needed.');
    replica=await MongoMemoryReplSet.create({binary:{version:'8.0.16',downloadDir:resolve(backend,'storage/test-binaries')},replSet:{count:1,storageEngine:'wiredTiger'},instanceOpts:[{ip:'127.0.0.1'}]});
    const dbName=`browser_${randomUUID().replaceAll('-','')}`;
    connection=await createConnection(replica.getUri(),{dbName,autoCreate:false,autoIndex:false}).asPromise();await provisionDatabase(connection);await verifyDatabase(connection);await connection.close();connection=undefined;
    api=spawn(process.execPath,['dist/main.js'],{cwd:backend,windowsHide:true,stdio:['ignore','ignore','pipe'],env:{...process.env,MONGODB_URI:replica.getUri(),MONGODB_DB_NAME:dbName,DATABASE_ENABLED:'true',AUTH_ACCESS_TOKEN_SECRET:randomBytes(48).toString('base64url'),PORT:'4310',FRONTEND_ORIGIN:base,ORIGINAL_STORAGE_ROOT:join(root,'originals'),ACCOUNT_CLEANUP_ENABLED:'false',PROJECT_CLEANUP_ENABLED:'false',IMPORT_RECOVERY_ENABLED:'false',AUTH_REGISTER_LIMIT:'100',AUTH_LOGIN_LIMIT:'100'}});
    api.stderr.pipe(process.stderr);
    for(let attempt=0;;attempt++){
      if(api.exitCode!==null)throw new Error('Backend exited before readiness');
      try{if((await fetch('http://127.0.0.1:4310/api/v1/health')).ok)break;}catch{/* readiness */}
      if(attempt>=100)throw new Error('Backend startup timeout');await new Promise(ready=>setTimeout(ready,200));
    }
    server=createServer({cert:await readFile(cert),key:await readFile(key)},(req,res)=>{
      if(req.url?.startsWith('/api/')){
        const upstream=httpRequest({host:'127.0.0.1',port:4310,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:4310'}},response=>{res.writeHead(response.statusCode||502,response.headers);response.pipe(res);});
        upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);return;
      }
      void(async()=>{
        const dist=resolve(frontend,'dist'),pathname=decodeURIComponent(new URL(req.url||'/',base).pathname),target=resolve(dist,'.'+pathname),rel=relative(dist,target);
        if(rel.startsWith('..'+sep)||rel==='..'||isAbsolute(rel)){res.writeHead(403);res.end();return;}
        const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json'};
        try{res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream');res.end(await readFile(target));}
        catch{res.setHeader('Content-Type','text/html');res.end(await readFile(join(dist,'index.html')));}
      })().catch(()=>{res.writeHead(500);res.end();});
    });
    await new Promise((ready,reject)=>{server.once('error',reject);server.listen(4174,'127.0.0.1',ready);});
    const fingerprint=createHash('sha256').update(new X509Certificate(await readFile(cert)).publicKey.export({type:'spki',format:'der'})).digest('base64');
    const test=spawn(process.execPath,[require.resolve('@playwright/test/cli'),'test','--config',resolve(frontend,'playwright.acceptance.config.ts'),...process.argv.slice(2)],{cwd:frontend,stdio:'inherit',windowsHide:true,env:{...process.env,ACCEPTANCE_BASE_URL:base,ACCEPTANCE_CERT_SPKI:fingerprint}});
    process.exitCode=await completion(test);
  }finally{
    if(server){server.closeAllConnections();await new Promise(done=>server.close(done));}
    if(api&&api.exitCode===null){const done=completion(api);api.kill();await done;}
    await connection?.close();await replica?.stop();
    const rel=relative(resolve(tmpdir()),resolve(root));
    if(rel.startsWith('dashboard-browser-')&&!rel.includes(sep)&&!isAbsolute(rel))await rm(root,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
