import type { LocalProject } from '../repositories/project-store';
export const MAX_AUTO_ATTEMPTS=5;
export function retryDelay(attempt:number){return Math.min(60_000,2000*2**Math.max(0,attempt-1));}
export function autoEligible(project:LocalProject,userId:string){return !!project.autoSync&&project.accountId===userId&&!['conflict','blocked'].includes(project.status)&&(!project.datasetId||project.cursor<project.operations.length)&&(project.syncRetry?.attempt??0)<MAX_AUTO_ATTEMPTS;}
