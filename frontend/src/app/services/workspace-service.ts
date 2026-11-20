import { projectsApi,workspaceDrafts,draftMatches,type WorkspaceDraft,type WorkspacePatch,type Workspace } from '../../features/projects';
import { datasetsApi } from '../../features/datasets';

export const workspaceService={
  detail:projectsApi.detail,
  save:projectsApi.workspace,
  metadata:datasetsApi.metadata,
  rows:datasetsApi.rows,
  row:datasetsApi.row,
  drafts(userId:string,projectId:string,workspace:Workspace){return workspaceDrafts.list(userId,projectId).filter(draft=>!draftMatches(workspace,draft));},
  persist(userId:string,projectId:string,id:string,patch:WorkspacePatch,workspace:Workspace){
    if(Object.keys(patch).length)workspaceDrafts.save({schema:1,id,userId,projectId,revision:workspace.revision,boundVersionId:workspace.boundVersionId,patch,updatedAt:new Date().toISOString()});
    else workspaceDrafts.remove(userId,projectId,id);
  },
  removeDraft(draft:WorkspaceDraft){workspaceDrafts.remove(draft.userId,draft.projectId,draft.id);},
};
