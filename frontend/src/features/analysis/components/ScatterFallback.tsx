import { useMemo,useRef,useState,type PointerEvent } from 'react';
import type { Points3dResult } from '@dashboard/data-core';
import { Button } from '../../../shared/ui';
import { scatterModel } from '../scatter-model';

import type { ScatterRenderProps } from '../scatter-colors';

export type ScatterPoint=Points3dResult['points'][number];
const size={width:640,height:430};
/** Orthographic 3D projection. Coordinates remain server/core values; normalization is visual only. */
export function ScatterFallback({points,axes,colors,labels,selected,onSelect}:ScatterRenderProps){
  const [yaw,setYaw]=useState(35),[pitch,setPitch]=useState(25),[zoom,setZoom]=useState(1),[focused,setFocused]=useState<string>();
  const drag=useRef<{x:number;y:number;yaw:number;pitch:number}|undefined>(undefined);
  const normalized=useMemo(()=>scatterModel(points,axes).points.map(item=>({point:item.source,coords:item.position.map(value=>value/4)})),[points,axes]);
  function project(coords:number[]){
    const y=yaw*Math.PI/180,p=pitch*Math.PI/180;
    const x=coords[0]*Math.cos(y)-coords[2]*Math.sin(y),z=coords[0]*Math.sin(y)+coords[2]*Math.cos(y);
    const vertical=coords[1]*Math.cos(p)-z*Math.sin(p),depth=coords[1]*Math.sin(p)+z*Math.cos(p);
    return {x:size.width/2+x*125*zoom,y:size.height/2-vertical*125*zoom,depth};
  }
  function down(event:PointerEvent<SVGSVGElement>){if((event.target as Element).closest('[data-point]'))return;drag.current={x:event.clientX,y:event.clientY,yaw,pitch};event.currentTarget.setPointerCapture(event.pointerId);}
  function move(event:PointerEvent<SVGSVGElement>){if(!drag.current)return;setYaw(drag.current.yaw+(event.clientX-drag.current.x)*.5);setPitch(Math.max(-85,Math.min(85,drag.current.pitch+(event.clientY-drag.current.y)*.5)));}
  const plotted=normalized.map(item=>({...item,...project(item.coords)})).sort((a,b)=>a.depth-b.depth);
  const origin=project([-1,-1,-1]),tabStop=points.some(item=>item.rowId===focused)?focused:points[0]?.rowId;
  return <div className="scatter-view"><p className="muted">Kéo nền để xoay; dùng nút hoặc thanh điều khiển khi thao tác bàn phím. Trong biểu đồ, phím mũi tên chuyển điểm, Enter chọn dòng; cũng có danh sách điểm bên dưới. Trục được co giãn riêng để quan sát, giá trị gốc giữ nguyên.</p>
    <svg viewBox={`0 0 ${size.width} ${size.height}`} className="scatter-svg" role="group" aria-label="Biểu đồ 3D tương tác" onPointerDown={down} onPointerMove={move} onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}>
      <rect width={size.width} height={size.height} fill={colors.palette.background} rx="12"/>
      {Array.from({length:9},(_,i)=>{const t=-1+i/4;return [[[-1,-1,t],[1,-1,t]],[[t,-1,-1],[t,-1,1]]].map(([a,b],j)=>{const start=project(a),end=project(b);return <line key={`${i}:${j}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={colors.palette.grid} strokeWidth="1" pointerEvents="none"/>;});})}

      {plotted.map(({point,x,y})=><circle key={point.rowId} data-point={point.rowId} role="button" tabIndex={point.rowId===tabStop?0:-1} onFocus={()=>setFocused(point.rowId)} aria-label={`Điểm ${point.rowId}: ${point.x}, ${point.y}, ${point.z}`} aria-pressed={selected===point.rowId} cx={x} cy={y} r={selected===point.rowId?7:4.5} fill={colors.color(point,selected===point.rowId)} stroke={selected===point.rowId?'var(--text)':'var(--surface)'} strokeWidth={selected===point.rowId?2.5:1} onClick={()=>onSelect(point.rowId)} onKeyDown={event=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const index=points.findIndex(item=>item.rowId===point.rowId),next=event.key==='Home'?0:event.key==='End'?points.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+points.length)%points.length;event.currentTarget.ownerSVGElement?.querySelector<SVGCircleElement>(`circle[data-point="${CSS.escape(points[next].rowId)}"]`)?.focus();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(point.rowId);}}}><title>{`X=${point.x}, Y=${point.y}, Z=${point.z}; missing=${point.missingCount}; outlier=${point.isOutlier}`}</title></circle>)}
      {labels.map((label,i)=>{const end=project([i===0?1.2:-1,i===1?1.2:-1,i===2?1.2:-1]);return <g key={i} pointerEvents="none"><line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={colors.palette.axes[i]} strokeWidth="2"/><text x={Math.max(8,Math.min(530,end.x))} y={Math.max(18,Math.min(410,end.y))} fill="var(--text)" stroke="var(--tint)" strokeWidth="4" paintOrder="stroke" fontWeight="700">{['X','Y','Z'][i]}<title>{label}</title></text></g>;})}
      {!points.length&&<text x="320" y="215" textAnchor="middle" fill="var(--muted)">Không có điểm đủ tọa độ</text>}
    </svg>
    <div className="axis-legend" aria-label="Tên trục 3D">{labels.map((label,i)=><span key={i}><strong>{['X','Y','Z'][i]}:</strong> {label}</span>)}</div>
    <div className="form-grid"><label>Góc ngang<input aria-label="Góc ngang 3D" type="range" min="-180" max="180" value={((yaw+540)%360)-180} onChange={event=>setYaw(Number(event.target.value))}/></label><label>Góc đứng<input aria-label="Góc đứng 3D" type="range" min="-85" max="85" value={pitch} onChange={event=>setPitch(Number(event.target.value))}/></label><label>Thu phóng<input aria-label="Thu phóng 3D" type="range" min="0.5" max="1.5" step="0.1" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label></div>
    <div className="toolbar"><Button variant="secondary" onClick={()=>setYaw(yaw-15)}>Xoay trái</Button><Button variant="secondary" onClick={()=>setYaw(yaw+15)}>Xoay phải</Button><Button variant="secondary" onClick={()=>{setYaw(35);setPitch(25);setZoom(1);}}>Đặt lại góc nhìn</Button></div>
  </div>;
}
