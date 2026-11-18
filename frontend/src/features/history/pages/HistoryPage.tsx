import { useHistory,type HistoryProps } from '../hooks/useHistory';
import { HistoryPanel } from '../components/HistoryPanel';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function HistoryPage(props:HistoryProps){
  const model=useHistory(props);
  return <HistoryPanel {...model}/>;
}
