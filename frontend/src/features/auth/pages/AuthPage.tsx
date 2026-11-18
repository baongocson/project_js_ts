import { useAuthForm,type AuthFormProps } from '../hooks/useAuthForm';
import { AuthView } from '../components/AuthView';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function AuthPage(props:AuthFormProps){
  const model=useAuthForm(props);
  return <AuthView {...model}/>;
}
