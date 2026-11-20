export interface ProjectProgress {id:string;status:'local'|'syncing'|'synced'|'retry'|'conflict'|'blocked';cursor:number;total:number;phase?:string;error?:string;version:string;autoSync?:boolean;syncRetry?:{attempt:number;nextAt:number};removed?:boolean}
const listeners=new Set<(event:ProjectProgress)=>void>();let channel:BroadcastChannel|undefined;
export function subscribeProjectProgress(listener:(event:ProjectProgress)=>void){
  listeners.add(listener);
  if(!channel&&typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('data-workspace-project-progress-v1');channel.onmessage=(message:MessageEvent<ProjectProgress>)=>{const value=message.data;if(value&&typeof value.id==='string'&&Number.isSafeInteger(value.cursor)&&Number.isSafeInteger(value.total))for(const listener of listeners)listener(value);};}
  return()=>{listeners.delete(listener);if(!listeners.size){channel?.close();channel=undefined;}};
}
export function publishProjectProgress(project:{id:string;status:ProjectProgress['status'];cursor:number;operations:{id:string;phase:string}[];error?:string;autoSync?:boolean;syncRetry?:ProjectProgress['syncRetry']}){
  const event:ProjectProgress={id:project.id,status:project.status,cursor:project.cursor,total:project.operations.length,phase:project.operations[project.cursor]?.phase,error:project.error,version:project.operations.at(-1)?.id??'original',autoSync:project.autoSync,syncRetry:project.syncRetry};
  for(const listener of listeners)try{listener(event);}catch{/* Observers cannot turn a committed write into a failed save. */}channel?.postMessage(event);
}
export function publishProjectRemoval(id:string){const event:ProjectProgress={id,status:'blocked',cursor:0,total:0,version:'removed',removed:true,error:'LOCAL_PROJECT_REMOVED'};for(const listener of listeners)try{listener(event);}catch{/* UI observer failure does not undo a committed deletion. */}channel?.postMessage(event);}
