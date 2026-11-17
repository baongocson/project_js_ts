import { requestJson } from '../../../shared/api';
import type { Project,ProjectDetail,Page,Workspace,Adjustment } from '../types';
export const projectsApi={
  list:(query:URLSearchParams,signal?:AbortSignal)=>requestJson<Page<Project>>(`projects?${query}`,{signal}),
  create:(name:string,key:string)=>requestJson<{project:Project}>('projects',{method:'POST',json:{name},headers:{'Idempotency-Key':key}}),
  detail:(id:string,signal?:AbortSignal)=>requestJson<ProjectDetail>(`projects/${id}`,{signal}),
  rename:(id:string,name:string)=>requestJson<Project>(`projects/${id}`,{method:'PATCH',json:{name},replay:'safe'}),
  delete:(id:string)=>requestJson<void>(`projects/${id}`,{method:'DELETE'}),
  workspace:(id:string,patch:Pick<Workspace,'revision'|'boundVersionId'>&Partial<Pick<Workspace,'activeTab'|'chartConfig'|'selection'|'tableState'>>,signal?:AbortSignal)=>requestJson<{workspace:Workspace;workspaceAdjusted:boolean;adjustments:Adjustment[]}>(`projects/${id}/workspace`,{method:'PATCH',json:patch,signal}),
};
