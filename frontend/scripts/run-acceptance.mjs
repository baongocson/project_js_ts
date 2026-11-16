import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run with npm run test:acceptance -w frontend');
for(const [script,args] of [[npm,['run','build']],[fileURLToPath(new URL('../../backend/scripts/test-browser-local.cjs',import.meta.url)),[]]]){
  const result=spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,VITE_API_BASE_URL:'/api/v1'},stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
