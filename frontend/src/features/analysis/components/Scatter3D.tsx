import { Component, Suspense, lazy, useState, type ReactNode } from 'react';
import type { ScatterProps } from '../types';
import { Button } from '../../../shared/ui';
import { ScatterFallback } from './ScatterFallback';

const WebGLScatter = lazy(() => import('./WebGLScatter').then(module => ({ default: module.WebGLScatter })));
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function Scatter3D(props: ScatterProps) {
  const [simple, setSimple] = useState(false);
  const fallback = <><p className="notice">WebGL không khả dụng. Bạn vẫn có thể xoay hình chiếu và chọn dòng bằng bàn phím hoặc danh sách.</p><ScatterFallback {...props}/></>;
  return <div className="scatter-renderer">
    <div className="scene-mode"><span className="badge">{simple ? 'Hình chiếu tương thích' : '3D · WebGL'}</span>
      <Button variant="secondary" onClick={() => setSimple(value => !value)}>{simple ? 'Dùng WebGL 3D' : 'Dùng hình chiếu tương thích'}</Button></div>
    {simple ? <ScatterFallback {...props}/> : <SceneBoundary fallback={fallback}>
      <Suspense fallback={<p aria-live="polite">Đang chuẩn bị không gian 3D…</p>}><WebGLScatter {...props}/></Suspense>
    </SceneBoundary>}
  </div>;
}
