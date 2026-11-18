import { useProcessing,type ProcessingProps } from '../hooks/useProcessing';
import { ProcessingPanel } from '../components/ProcessingPanel';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function ProcessingPage(props:ProcessingProps){
  const model=useProcessing(props);
  return <ProcessingPanel {...model}/>;
}
