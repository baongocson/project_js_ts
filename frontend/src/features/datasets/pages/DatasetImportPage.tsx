import { useImportWizard,type ImportWizardProps } from '../hooks/useImportWizard';
import { ImportWizard } from '../components/ImportWizard';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function DatasetImportPage(props:ImportWizardProps){
  const model=useImportWizard(props);
  return <ImportWizard {...model}/>;
}
