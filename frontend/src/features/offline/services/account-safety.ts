import { projectLock,projectStore } from '../repositories/project-store';
import { workspaceDrafts } from '../../projects';

export async function inspectLocalAccount(userId:string){
  const projects=(await projectStore.list()).filter(project=>project.accountId===userId);
  const drafts=workspaceDrafts.listAccount(userId);
  return {localProjectCount:projects.length,workspaceDraftCount:drafts.length,pendingCount:projects.reduce((sum,project)=>sum+project.operations.length-project.cursor+(!project.datasetId?1:0),0),
    removeLocal:async()=>{for(const project of projects)await projectStore.remove(project.id);for(const draft of drafts)workspaceDrafts.remove(userId,draft.projectId,draft.id);}};
}
export async function withLocalAccountLock(userId:string,work:()=>Promise<void>){
  const ids=(await projectStore.list()).filter(project=>project.accountId===userId).map(project=>project.id).sort();
  async function lock(index:number):Promise<void>{if(index===ids.length){await work();return;}await projectLock(ids[index],()=>lock(index+1));}
  await lock(0);
}
