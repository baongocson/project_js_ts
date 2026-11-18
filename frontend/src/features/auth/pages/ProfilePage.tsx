import { useProfile,type ProfileProps } from '../hooks/useProfile';
import { ProfileView } from '../components/ProfileView';

/** Composes feature state and presentation; embedded in a workspace when no standalone route is needed. */
export function ProfilePage(props:ProfileProps){
  const model=useProfile(props);
  return <ProfileView {...model}/>;
}
