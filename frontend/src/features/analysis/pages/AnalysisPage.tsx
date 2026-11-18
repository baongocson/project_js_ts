import { useAnalysis,type AnalysisProps } from '../hooks/useAnalysis';
import { AnalysisPanel } from '../components/AnalysisPanel';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function AnalysisPage(props:AnalysisProps){
  const model=useAnalysis(props);
  return <AnalysisPanel {...model}/>;
}
