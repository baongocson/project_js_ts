import { useProjects } from '../hooks/useProjects';
import { ProjectsView } from '../components/ProjectsView';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function ProjectsPage(){
  const model=useProjects();
  return <ProjectsView {...model}/>;
}
