import { useEffect, useRef, useState } from 'react';
import type { DataTable } from './model';

interface Props { table: DataTable; x: number; y: number; z: number }
type Point = { x: number; y: number; z: number };
function getPoints(table: DataTable, axes: [number, number, number]): Point[] {
  if (axes.some(index => !Number.isInteger(index) || index < 0 || index >= table.columns.length)) return [];
  const sampled = table.rows.slice(0, 4000)
    .filter(row => axes.every(index => typeof row[index] === 'string' && row[index].trim() !== '' && row[index].trim().toLowerCase() !== 'n/a'))
    .map(row => axes.map(index => Number(row[index])))
    .filter(values => values.every(Number.isFinite));
  if (sampled.length === 0) return [];
  const mins = [0, 1, 2].map(axis => Math.min(...sampled.map(item => item[axis])));
  const maxs = [0, 1, 2].map(axis => Math.max(...sampled.map(item => item[axis])));
  return sampled.map(values => {
    const p = values.map((value, axis) => (maxs[axis] === mins[axis] ? 0 : (value - mins[axis]) / (maxs[axis] - mins[axis]) * 2 - 1));
    return { x: p[0], y: p[1], z: p[2] };
  });
}
export function PointCloud({ table, x, y, z }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [spin, setSpin] = useState(true);
  const angle = useRef({ yaw: 0.6, pitch: 0.35 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const zoom = useRef(1);
  useEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext('2d');
    if (!surface || !ctx) return;
    const points = getPoints(table, [x, y, z]);
    let frame = 0;
    let request = 0;
    const render = () => {
      const width = surface.width;
      const height = surface.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#08152c'; ctx.fillRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.26 * zoom.current;
      const yaw = angle.current.yaw;
      const pitch = angle.current.pitch;
      const rotate = (p: Point) => {
        const rx = p.x * Math.cos(yaw) - p.z * Math.sin(yaw);
        const rz = p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
        const ry = p.y * Math.cos(pitch) - rz * Math.sin(pitch);
        const depth = p.y * Math.sin(pitch) + rz * Math.cos(pitch);
        const projection = 2.8 / (3.5 + depth);
        return { px: centerX + rx * scale * projection, py: centerY - ry * scale * projection, depth };
      };
      for (const [point, color] of [
        [{ x: 1.35, y: 0, z: 0 }, '#fb7185'],
        [{ x: 0, y: 1.35, z: 0 }, '#4ade80'],
        [{ x: 0, y: 0, z: 1.35 }, '#60a5fa'],
      ] as const) {
        const origin = rotate({ x: 0, y: 0, z: 0 }); const end = rotate(point);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(end.px, end.py); ctx.stroke();
      }
      const mapped = points.map(p => rotate(p)).sort((a, b) => b.depth - a.depth);
      for (const p of mapped) {
        ctx.beginPath(); ctx.arc(p.px, p.py, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${Math.max(0.38, 0.85 - p.depth * 0.12)})`; ctx.fill();
      }
      if (points.length === 0) { ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.fillText('Hãy chọn ba cột chứa số để hiển thị điểm 3D', centerX, centerY); }
      if (spin && !drag.current) angle.current.yaw += 0.003;
      frame += 1;
      request = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(request); void frame; };
  }, [table, x, y, z, spin]);
  return <div className="cloud"><div className="cloudtoolbar"><span>3D toán học · tối đa 4.000 điểm</span><button type="button" onClick={() => setSpin(old => !old)}>{spin ? 'Tạm dừng xoay' : 'Tự động xoay'}</button></div><canvas ref={canvas} width={750} height={420} aria-label="Đám mây điểm 3D; kéo để xoay và cuộn để zoom" onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!drag.current) return; angle.current.yaw += (event.clientX - drag.current.x) * 0.009; angle.current.pitch = Math.max(-1.4, Math.min(1.4, angle.current.pitch + (event.clientY - drag.current.y) * 0.009)); drag.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onWheel={event => { zoom.current = Math.max(0.4, Math.min(3, zoom.current * (event.deltaY > 0 ? 0.91 : 1.09))); }}/></div>;
}
