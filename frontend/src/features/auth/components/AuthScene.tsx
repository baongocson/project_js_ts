import { lazy, Suspense, Component, type ReactNode } from 'react';
import { useMediaQuery } from '../../../shared/ui/useMediaQuery';

const Globe = lazy(() => import('./AuthGlobe'));
class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AuthScene() {
  const desktop = useMediaQuery('(min-width: 1000px)');
  return <div className="auth-scene">
    <div className="auth-scene-depth" aria-hidden="true" data-testid="auth-globe-fallback">
      <div className="orbit orbit-outer" />
      <div className="orbit orbit-inner" />
      <div className="planet planet-main" />
      <div className="orbit orbit-front" />
      <div className="moon-path"><div className="planet planet-moon" /></div>
      <div className="planet planet-distant" />
    </div>
    {desktop && <GlobeBoundary><Suspense fallback={null}><Globe /></Suspense></GlobeBoundary>}
  </div>;
}

