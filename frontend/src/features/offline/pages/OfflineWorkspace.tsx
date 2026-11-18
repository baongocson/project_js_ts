import { useOfflineWorkspace } from '../hooks/useOfflineWorkspace';
import { OfflineWorkspaceView } from '../components/OfflineWorkspaceView';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function OfflineWorkspace(){
  const model=useOfflineWorkspace();
  return <OfflineWorkspaceView {...model}/>;
}
