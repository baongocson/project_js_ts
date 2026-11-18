import { useWorkspace } from '../hooks/useWorkspace';
import { WorkspaceView } from '../components/WorkspaceView';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function WorkspacePage(){
  const model=useWorkspace();
  return <WorkspaceView {...model}/>;
}
