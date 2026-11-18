import { Component, Suspense, lazy, useState, useEffect, useMemo, useId, type ReactNode } from 'react';
import type { ScatterProps } from '../types';
import { Button } from '../../../shared/ui';
import { ScatterFallback } from './ScatterFallback';
import { scatterColors, type NumericAxis } from '../scatter-colors';
import { ScatterLegend } from './ScatterLegend';

const WebGLScatter = lazy(() => import('./WebGLScatter').then(module => ({ default: module.WebGLScatter })));
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function Scatter3D(props: ScatterProps) {
  const colorId = useId();
  const [simple, setSimple] = useState(false);
  const [axis, setAxis] = useState<NumericAxis>('none');
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  useEffect(() => { const update = () => setDark(document.documentElement.dataset.theme === 'dark'); const observer = new MutationObserver(update); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => observer.disconnect(); }, []);
  const colors = useMemo(() => scatterColors(props.points, props.axes, props.colorMode, axis, dark), [props.points, props.axes, props.colorMode, axis, dark]);
  const fallback = <><p className="notice">WebGL không khả dụng. Bạn vẫn có thể xoay hình chiếu và chọn dòng bằng bàn phím hoặc danh sách.</p><ScatterFallback {...props} colors={colors}/></>;
  return <div className="scatter-renderer">
    <div className="scene-mode"><span className="badge">{simple ? 'Hình chiếu tương thích' : '3D · WebGL'}</span>
      <Button variant="secondary" onClick={() => setSimple(value => !value)}>{simple ? 'Dùng WebGL 3D' : 'Dùng hình chiếu tương thích'}</Button></div>
    <div className="toolbar"><label htmlFor={colorId}>Màu hiển thị</label><select id={colorId} value={axis} onChange={event => setAxis(event.target.value as NumericAxis)}><option value="none">Theo chế độ màu điểm</option>{(['x','y','z'] as const).map((value, index) => <option key={value} value={value}>Gradient {value.toUpperCase()} · {props.labels[index]}</option>)}</select><small className="muted">Chỉ đổi hiển thị · không lưu vào workspace hay thay dữ liệu.</small></div>
    <ScatterLegend colors={colors}/>
    {simple ? <ScatterFallback {...props} colors={colors}/> : <SceneBoundary key={simple ? 'svg' : 'webgl'} fallback={fallback}>
      <Suspense fallback={<p aria-live="polite">Đang chuẩn bị không gian 3D…</p>}><WebGLScatter {...props} colors={colors}/></Suspense>
    </SceneBoundary>}
  </div>;
}
