import { projectsApi } from '../api/projects-api';

export function normalizeProjectName(name:string){
  const value=name.trim();
  if(!value||Array.from(value).length>100)throw new Error('Tên project cần dài 1–100 ký tự');
  return value;
}
export const projectService={
  ...projectsApi,
  create:(name:string,key:string)=>projectsApi.create(normalizeProjectName(name),key),
  rename:(id:string,name:string)=>projectsApi.rename(id,normalizeProjectName(name)),
};
