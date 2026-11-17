import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, type InstancedMesh, Object3D, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Button } from '../../../shared/ui';
import type { ScatterPoint, ScatterProps } from '../types';
import { scatterModel } from '../scatter-model';

type VisualPoint = { source: ScatterPoint; position: [number, number, number] };
function TickLabel({text,position}:{text:string;position:[number,number,number]}){
  const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const context=canvas.getContext('2d')!;context.font='26px system-ui';context.textAlign='center';context.fillStyle='#e1edf3';context.fillText(text,128,42);return new CanvasTexture(canvas);},[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <sprite position={position} scale={[1.5,.375,1]}><spriteMaterial map={texture} transparent depthTest={false}/></sprite>;
}
function CoordinateAxes({model,labels}:{model:ReturnType<typeof scatterModel>;labels:ScatterProps['labels']}){
  return <><axesHelper args={[8]} position={[-4,-4,-4]}/>{model.ticks.flatMap((ticks,axis)=>ticks.map((tick,index)=>{
    const position:[number,number,number]=[-4,-4,-4];position[axis]=tick.position;
    if(axis===0)position[1]-=.4;else position[0]-=.5;
    return <TickLabel key={`${axis}:${index}`} text={tick.value.toLocaleString('vi-VN',{maximumSignificantDigits:4})} position={position}/>;
  }))}{labels.map((label,axis)=>{const position:[number,number,number]=[-4,-4,-4];position[axis]=5;return <TickLabel key={axis} text={`${['X','Y','Z'][axis]} · ${label}`} position={position}/>;})}</>;
}
function Camera({ reset, turn, zoom }: { reset: number; turn: number; zoom: number }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.minDistance = 5; orbit.maxDistance = 45;
    const changed = () => invalidate();
    orbit.addEventListener('change', changed);
    orbit.update();
    return () => { orbit.removeEventListener('change', changed); orbit.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const radius = 17 / zoom, angle = (45 + turn) * Math.PI / 180;
    camera.position.set(Math.sin(angle) * radius, radius * .65, Math.cos(angle) * radius);
    controls.current?.target.set(0, 0, 0); controls.current?.update(); invalidate();
  }, [camera, invalidate, reset, turn, zoom]);
  return null;
}
function PointCloud({ points, selected, colorMode, onSelect, onHover }: {
  points: VisualPoint[]; selected?: string; colorMode: ScatterProps['colorMode'];
  onSelect(id: string): void; onHover(point: ScatterPoint | null): void;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    if (!mesh.current) return;
    const object = new Object3D();
    for (const [index, point] of points.entries()) {
      object.position.set(...point.position); object.scale.setScalar(selected === point.source.rowId ? 1.8 : 1); object.updateMatrix();
      mesh.current.setMatrixAt(index, object.matrix);
      mesh.current.setColorAt(index, new Color(selected === point.source.rowId ? '#ffffff'
        : colorMode === 'missing' && point.source.missingCount > 0 ? '#f4b963'
        : colorMode === 'outlier' && point.source.isOutlier ? '#fb7185' : '#55c9c0'));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere(); invalidate();
  }, [points, selected, colorMode, invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}
    onClick={event => { const point = event.instanceId === undefined ? undefined : points[event.instanceId]; if (point && event.delta < 5) { event.stopPropagation(); onSelect(point.source.rowId); } }}
    onPointerMove={event => { event.stopPropagation(); onHover(event.instanceId === undefined ? null : points[event.instanceId]?.source ?? null); }}
    onPointerOut={() => onHover(null)}>
    <sphereGeometry args={[.08, 10, 8]}/><meshStandardMaterial roughness={.4} metalness={.15}/>
  </instancedMesh>;
}
function Projection({ position }: { position: [number, number, number] }) {
  const endpoints: [number, number, number][] = [[position[0], -4, position[2]], [-4, position[1], position[2]], [position[0], position[1], -4]];
  return <>{endpoints.map((end, index) => {
    const a = new Vector3(...position), b = new Vector3(...end), center = a.clone().add(b).multiplyScalar(.5);
    const object = new Object3D(); object.position.copy(center); object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return <mesh key={index} position={object.position} quaternion={object.quaternion}><cylinderGeometry args={[.012, .012, a.distanceTo(b), 6]}/><meshBasicMaterial color="#f6d487"/></mesh>;
  })}</>;
}
export function WebGLScatter({ points, axes, labels, colorMode, selected, onSelect }: ScatterProps) {
  const model=useMemo(()=>scatterModel(points,axes),[points,axes]),plotted=model.points;
  const ranges=model.min.map((value,index)=>Number.isFinite(value)?value.toLocaleString('vi-VN',{maximumSignificantDigits:6})+' → '+model.max[index].toLocaleString('vi-VN',{maximumSignificantDigits:6}):'N/A');
  const [hover, setHover] = useState<ScatterPoint | null>(null), [pinned, setPinned] = useState<string>();
  const [projection, setProjection] = useState(false), [reset, setReset] = useState(0), [turn, setTurn] = useState(0), [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const active = plotted.find(point => point.source.rowId === (pinned ?? hover?.rowId ?? selected));
  const inspected = active?.source;
  return <div className="webgl-scatter">
    <p className="muted">Kéo để xoay · Cuộn để zoom · Rê chuột để xem · Click để ghim và mở dòng. Co giãn trục chỉ phục vụ hiển thị.</p>
    <div className="scene-canvas" role="group" aria-label="Biểu đồ 3D tương tác" data-testid="webgl-scene" data-ready={ready} data-active-row={inspected?.rowId ?? ''}>
      <Canvas camera={{ position: [12, 11, 13], fov: 45 }} frameloop="demand" dpr={[1, 1.5]} onCreated={({ gl }) => {
        gl.domElement.setAttribute('aria-label', 'Không gian WebGL 3D');
        gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setReady(false); });
        setReady(true);
      }} fallback={<p>WebGL không được hỗ trợ. Chọn hình chiếu tương thích phía trên.</p>}>
        <color attach="background" args={['#0d1729']}/><ambientLight intensity={1.5}/><directionalLight position={[5, 8, 6]} intensity={2}/>
        <gridHelper args={[8, 8, '#2f5560', '#203444']} position={[0, -4, 0]}/><CoordinateAxes model={model} labels={labels}/>
        <PointCloud points={plotted} selected={selected} colorMode={colorMode} onSelect={id => { setPinned(id); onSelect(id); }} onHover={setHover}/>
        {projection && active && <Projection position={active.position}/>}
        <Camera reset={reset} turn={turn} zoom={zoom}/>
      </Canvas>
      <span className="scene-label scene-x">X · {labels[0]}</span><span className="scene-label scene-y">Y · {labels[1]}</span><span className="scene-label scene-z">Z · {labels[2]}</span>
      {inspected && <div className="scene-tooltip"><strong>{pinned ? 'Đã ghim' : 'Đang xem'} · {inspected.rowId}</strong><span>X {inspected.x} · Y {inspected.y} · Z {inspected.z}</span><span>Missing {inspected.missingCount} · {inspected.isOutlier ? 'Có outlier' : 'Không outlier'}</span></div>}
    </div>
    {!ready && <p className="notice">Đang khởi tạo WebGL hoặc đã mất ngữ cảnh đồ họa. Có thể dùng hình chiếu tương thích và danh sách điểm.</p>}
    <div className="axis-legend">{labels.map((label,index)=><span key={index}><strong>{['X','Y','Z'][index]} · {label}</strong><small>{ranges[index]} · toàn phiên bản</small></span>)}</div>
    <div className="scene-toolbar"><label className="check"><input type="checkbox" checked={projection} onChange={event => setProjection(event.target.checked)}/>Chiếu điểm xuống mặt phẳng</label>
      <Button variant="secondary" disabled={!pinned} onClick={() => setPinned(undefined)}>Bỏ ghim</Button>
      <Button variant="secondary" disabled={!selected} onClick={() => setPinned(selected)}>Ghim dòng đang chọn</Button>
      <Button variant="secondary" onClick={() => setTurn(value => value - 15)}>Xoay trái</Button><Button variant="secondary" onClick={() => setTurn(value => value + 15)}>Xoay phải</Button>
      <Button variant="secondary" onClick={() => { setTurn(0); setZoom(1); setReset(value => value + 1); }}>Đặt lại góc nhìn</Button>
      <label>Thu phóng<input aria-label="Thu phóng 3D" type="range" min=".5" max="2" step=".1" value={zoom} onChange={event => setZoom(Number(event.target.value))}/></label>
    </div>
    <p className="scene-legend">{colorMode === 'missing' ? 'Vàng: dòng có missing' : colorMode === 'outlier' ? 'Đỏ: dòng có outlier' : 'Xanh: điểm dữ liệu'} · Trắng: dòng đang chọn</p>
  </div>;
}
