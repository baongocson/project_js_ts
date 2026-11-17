import { useEffect } from 'react';
import { session,useSession } from '../auth';
import { ApiError,requestJson } from '../../shared/api';
import { projectLock,projectStore,type LocalProject } from './project-store';
import { ProjectApi,syncLocalProject } from './project-sync';
import { subscribeProjectProgress } from './project-events';

export const MAX_AUTO_ATTEMPTS=5;
export function retryDelay(attempt:number){return Math.min(60_000,2000*2**Math.max(0,attempt-1));}
export function autoEligible(project:LocalProject,userId:string){return !!project.autoSync&&project.accountId===userId&&!['conflict','blocked'].includes(project.status)&&(!project.datasetId||project.cursor<project.operations.length)&&(project.syncRetry?.attempt??0)<MAX_AUTO_ATTEMPTS;}
export function SyncCoordinator(){
  const current=useSession(),userId=current.status==='authenticated'?current.user?._id:undefined;
  useEffect(()=>{
    const online=()=>{if(session.getSnapshot().status==='offline')void session.recover().catch(()=>{/* Session state explains why authentication could not resume. */});};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);
  },[]);
  useEffect(()=>{
    if(!userId)return;
    let stopped=false,running=false,again=false,timer:ReturnType<typeof setTimeout>|undefined;
    function schedule(delay=100){if(stopped)return;clearTimeout(timer);timer=setTimeout(()=>{if(running){again=true;return;}void run();},delay);}
    async function retry(project:LocalProject,code?:string,minimumDelay=0){
      await projectLock(project.id,async()=>{const latest=await projectStore.load(project.id);if(!latest||latest.accountId!==userId||!latest.autoSync||!['retry','syncing','local'].includes(latest.status))return;const attempt=(project.syncRetry?.attempt??0)+1;latest.syncRetry={attempt,nextAt:Date.now()+Math.max(retryDelay(attempt),minimumDelay)};if(code){latest.status='retry';latest.error=code;}await projectStore.save(latest);});
    }
    async function run(){
      if(stopped||!navigator.onLine)return;running=true;again=false;let next:number|undefined;
      try{
        await navigator.locks.request('data-workspace-sync-coordinator',{ifAvailable:true},async lock=>{
          if(!lock){next=Date.now()+2000;return;}
          const projects=(await projectStore.list()).filter(project=>autoEligible(project,userId!));
          for(const project of projects){
            if(stopped||session.getSnapshot().user?._id!==userId)break;
            const due=project.syncRetry?.nextAt??0;if(due>Date.now()){next=Math.min(next??Infinity,due);continue;}
            // onLine is only a hint: probe the API before reading credentials or replaying mutations.
            try{await requestJson('health',{auth:false});}catch(error){await retry(project,'NETWORK_OR_API_UNAVAILABLE',error instanceof ApiError?error.retryAfter??0:0);continue;}
            if(stopped||session.getSnapshot().user?._id!==userId)break;
            const result=await syncLocalProject(project.id,new ProjectApi(()=>session.accessToken()??''));
            if(result.status==='retry')await retry(project,undefined,result.retryAfterMs??0);
          }
          const remaining=(await projectStore.list()).filter(project=>autoEligible(project,userId!));
          for(const project of remaining)next=Math.min(next??Infinity,project.syncRetry?.nextAt??Date.now()+100);
        });
      }catch{/* Storage/upgrade failures stay visible in the local workspace; no destructive fallback. */}
      finally{running=false;if(!stopped){if(again)schedule();else if(next!==undefined&&Number.isFinite(next))schedule(Math.max(100,Math.min(60_000,next-Date.now())));}}
    }
    const unsubscribe=subscribeProjectProgress(()=>schedule());const online=()=>schedule();window.addEventListener('online',online);schedule();
    return()=>{stopped=true;clearTimeout(timer);unsubscribe();window.removeEventListener('online',online);};
  },[userId]);
  return null;
}
