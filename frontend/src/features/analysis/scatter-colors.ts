import type { ScatterProps, ScatterPoint } from './types';
import { scatterModel } from './scatter-model';

export type NumericAxis = 'none' | 'x' | 'y' | 'z';
export function scatterColors(points: ScatterPoint[], axes: ScatterProps['axes'], mode: ScatterProps['colorMode'], axis: NumericAxis, dark: boolean) {
  const palette = dark
    ? { normal: '#22d3ee', missing: '#fbbf24', outlier: '#fb7185', selected: '#ffffff', low: '#22d3ee', mid: '#818cf8', high: '#e879f9', background: '#0b1220', grid: '#164e63', text: '#cbd5e1', axes: ['#22d3ee', '#c084fc', '#60a5fa'] }
    : { normal: '#0369a1', missing: '#b57520', outlier: '#b73350', selected: '#17253d', low: '#0369a1', mid: '#6d28d9', high: '#be185d', background: '#f0f5fc', grid: '#cbd5e1', text: '#334155', axes: ['#0369a1', '#7e22ce', '#1d4ed8'] };
  const index = ['x', 'y', 'z'].indexOf(axis), model = scatterModel(points, axes);
  const min = index < 0 ? NaN : model.min[index], max = index < 0 ? NaN : model.max[index];
  const range = Number.isFinite(min) && Number.isFinite(max) ? [min, max] as const : undefined;
  const mix = (a: string, b: string, t: number) => '#' + [1, 3, 5].map(offset => Math.round(parseInt(a.slice(offset, offset + 2), 16) * (1 - t) + parseInt(b.slice(offset, offset + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const color = (point: ScatterPoint, selected = false) => {
    if (selected) return palette.selected;
    if (index >= 0 && range) {
      const value = [point.x, point.y, point.z][index], scale = Math.max(Math.abs(min), Math.abs(max), 1);
      const span = max / scale - min / scale;
      const t = span ? Math.max(0, Math.min(1, (value / scale - min / scale) / span)) : .5;
      return t <= .5 ? mix(palette.low, palette.mid, t * 2) : mix(palette.mid, palette.high, (t - .5) * 2);
    }
    return mode === 'missing' && point.missingCount > 0 ? palette.missing : mode === 'outlier' && point.isOutlier ? palette.outlier : palette.normal;
  };
  const rangeScope = index >= 0 && axes?.[index]?.min !== null && axes?.[index]?.min !== undefined && axes?.[index]?.max !== null && axes?.[index]?.max !== undefined ? 'toàn phiên bản' : 'điểm hiển thị';
  return { palette, color, range, rangeScope, axis, mode };
}
export type ScatterColors = ReturnType<typeof scatterColors>;
export type ScatterRenderProps = ScatterProps & { colors: ScatterColors };
