import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, DynamicDrawUsage, Matrix4, type InstancedMesh, Object3D, PerspectiveCamera, Sphere, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useMediaQuery } from '../../../shared/ui/useMediaQuery';
import { Button } from '../../../shared/ui';
import type { ScatterPoint, ScatterProps } from '../types';
import { scatterModel } from '../scatter-model';
import type { ScatterRenderProps, ScatterColors } from '../scatter-colors';

type VisualPoint = { source: ScatterPoint; position: [number, number, number] };
function TickLabel({text,position,color}:{text:string;position:[number,number,number];color:string}){
  const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const context=canvas.getContext('2d')!;context.font='40px system-ui';context.textAlign='center';context.fillStyle=color;context.fillText(text,256,46,500);return new CanvasTexture(canvas);},[text,color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <sprite position={position} scale={[3.5,.4375,1]}><spriteMaterial map={texture} transparent depthTest={false} toneMapped={false}/></sprite>;
}
function CoordinateAxes({model,labels,colors}:{model:ReturnType<typeof scatterModel>;labels:ScatterProps['labels'];colors:ScatterColors}){
  const geometry=useMemo(()=>{
    const positions:number[]=[],rgb:number[]=[];
    colors.palette.axes.forEach((hex,axis)=>{const end=[-4,-4,-4];end[axis]=4;positions.push(-4,-4,-4,...end);const color=new Color(hex);rgb.push(color.r,color.g,color.b,color.r,color.g,color.b);});
    return {positions:new Float32Array(positions),rgb:new Float32Array(rgb)};
  },[colors.palette.axes]);
  return <><lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[geometry.positions,3]}/><bufferAttribute attach="attributes-color" args={[geometry.rgb,3]}/></bufferGeometry><lineBasicMaterial vertexColors toneMapped={false}/></lineSegments>{model.ticks.flatMap((ticks,axis)=>ticks.map((tick,index)=>{
    const position:[number,number,number]=[-4,-4,-4];position[axis]=tick.position;
    if(axis===0)position[1]-=.4;else position[0]-=.5;
    return <TickLabel key={`${axis}:${index}`} text={tick.value.toLocaleString('vi-VN',{maximumSignificantDigits:4})} position={position} color={colors.palette.text}/>;
  }))}{labels.map((label,axis)=>{const position:[number,number,number]=[-4,-4,-4];position[axis]=5;return <TickLabel key={axis} text={`${['X','Y','Z'][axis]} · ${label}`} position={position} color={colors.palette.axes[axis]}/>;})}</>;
}
type CameraCommand = { kind: 'reset' | 'turn' | 'zoom' | 'focus'; amount?: number; point?: [number, number, number] };
const ease = (value: number) => 1 - (1 - value) ** 3;

function Camera({ command, reduce }: { command: CameraCommand; reduce: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const { width, height } = useThree(state => state.size);
  const controls = useRef<OrbitControls | null>(null);
  const initialized = useRef(false);
  const animation = useRef<{ time: number; from: Vector3; to: Vector3; fromTarget: Vector3; toTarget: Vector3 } | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.minDistance = 5;
    orbit.maxDistance = 45;
    const changed = () => invalidate();
    const cancel = () => { animation.current = null; gl.domElement.setAttribute('data-camera-motion', 'idle'); };
    orbit.addEventListener('change', changed);
    orbit.addEventListener('start', cancel);
    orbit.update();
    return () => {
      orbit.removeEventListener('change', changed);
      orbit.removeEventListener('start', cancel);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enableDamping = !reduce;
    orbit.dampingFactor = .15;
    const fromTarget = orbit.target.clone();
    const from = camera.position.clone();
    const offset = from.clone().sub(fromTarget);
    const toTarget = command.kind === 'reset' ? new Vector3() :
      command.point ? new Vector3(...command.point).multiplyScalar(.7) : fromTarget.clone();
    if (command.kind === 'reset') offset.set(17 / Math.sqrt(2), 17 * .65, 17 / Math.sqrt(2));
    if (command.kind === 'turn') offset.applyAxisAngle(new Vector3(0, 1, 0), command.amount ?? 0);
    if (command.kind === 'zoom') offset.setLength(Math.min(45, Math.max(5, 17 * Math.hypot(1, .65) / (command.amount ?? 1))));
    const to = offset.add(toTarget);
    if (!initialized.current || reduce) {
      animation.current = null;
      camera.position.copy(to);
      orbit.target.copy(toTarget);
      orbit.update();
    } else {
      animation.current = { time: performance.now(), from, to, fromTarget, toTarget };
    }
    gl.domElement.setAttribute('data-camera-motion', animation.current ? 'running' : 'idle');
    initialized.current = true;
    invalidate();
  }, [camera, command, gl, invalidate, reduce]);
  useFrame(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const tween = animation.current;
    if (tween) {
      const progress = Math.min(1, (performance.now() - tween.time) / 340);
      camera.position.lerpVectors(tween.from, tween.to, ease(progress));
      orbit.target.lerpVectors(tween.fromTarget, tween.toTarget, ease(progress));
      if (progress < 1) invalidate();
      else { animation.current = null; gl.domElement.setAttribute('data-camera-motion', 'idle'); }
    }
    orbit.update();
  });
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || width <= 0 || height <= 0) return;
    const aspect = width / height;
    camera.setFocalLength(camera.getFilmHeight() * Math.min(1, aspect) / (2 * Math.tan(22 * Math.PI / 180)));
    camera.setViewOffset(width, height, 0, height * .05, width, height);
    invalidate();
  }, [camera, height, invalidate, width]);
  return null;
}

function PointCloud({ points, selected, hovered, colors, reduce, onSelect, onHover }: {
  points: VisualPoint[]; selected?: string; hovered?: string; colors: ScatterColors; reduce: boolean;
  onSelect(id: string): void; onHover(point: ScatterPoint | null): void;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const marker = useRef<Object3D>(null);
  const previous = useRef<{ mesh: InstancedMesh; points: VisualPoint[] } | null>(null);
  const tween = useRef<{ start: number; from: Float32Array; to: Float32Array } | null>(null);
  const { gl, invalidate } = useThree();
  const matrix = useMemo(() => new Matrix4(), []);
  const object = useMemo(() => new Object3D(), []);
  const temporary = useMemo(() => new Vector3(), []);
  const hoverIndex = useMemo(() => points.findIndex(point => point.source.rowId === hovered), [hovered, points]);

  useEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const old = previous.current;
    const sameProjection = old?.mesh === target && old.points.length === points.length &&
      points.every((point, index) => {
        const prior = old.points[index];
        return prior.source.rowId === point.source.rowId &&
          point.position.every((value, axis) => value === prior.position[axis]);
      });
    if (sameProjection && (!reduce || !tween.current)) return;
    const priorIndex = new Map(old?.points.map((point, i) => [point.source.rowId, i]));
    const from = new Float32Array(points.length * 3);
    const to = new Float32Array(points.length * 3);
    let changed = false;
    for (const [index, point] of points.entries()) {
      const i = index * 3;
      to.set(point.position, i);
      const oldIndex = priorIndex.get(point.source.rowId);
      if (old && oldIndex !== undefined) {
        old.mesh.getMatrixAt(oldIndex, matrix);
        temporary.setFromMatrixPosition(matrix);
      } else {
        temporary.set(...point.position).multiplyScalar(.76);
      }
      temporary.toArray(from, i);
      if (temporary.distanceToSquared(object.position.set(...point.position)) > 1e-8) changed = true;
    }
    const animate = changed && !reduce;
    tween.current = animate ? { start: performance.now(), from, to } : null;
    gl.domElement.setAttribute('data-point-motion', animate ? 'running' : 'idle');
    target.instanceMatrix.setUsage(DynamicDrawUsage);
    const initial = animate ? from : to;
    for (let index = 0; index < points.length; index++) {
      object.position.fromArray(initial, index * 3);
      object.scale.setScalar(1);
      object.updateMatrix();
      target.setMatrixAt(index, object.matrix);
    }
    target.instanceMatrix.needsUpdate = true;
    // The normalized cube also bounds every interpolated position and point radius.
    target.boundingSphere ??= new Sphere(new Vector3(), 7.2);
    previous.current = { mesh: target, points };
    invalidate();
  }, [gl, invalidate, matrix, object, points, reduce, temporary]);

  useEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const color = new Color();
    for (const [index, point] of points.entries()) {
      const chosen = point.source.rowId === selected;
      target.setColorAt(index, color.set(colors.color(point.source, chosen)));
      target.getMatrixAt(index, matrix);
      object.position.setFromMatrixPosition(matrix);
      object.scale.setScalar(chosen ? 1.8 : 1);
      object.updateMatrix();
      target.setMatrixAt(index, object.matrix);
    }
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    invalidate();
  }, [colors, invalidate, matrix, object, points, reduce, selected]);

  useEffect(() => { invalidate(); }, [hoverIndex, invalidate]);

  useFrame(() => {
    const target = mesh.current;
    if (!target) return;
    const transition = tween.current;
    if (transition) {
      const duration = points.length > 4000 ? 240 : 420;
      const progress = Math.min(1, (performance.now() - transition.start) / duration);
      const t = ease(progress);
      // Update only translation; scale and colors are set when selection or data changes.
      const matrices = target.instanceMatrix.array;
      for (let index = 0; index < points.length; index++) {
        const i = index * 3;
        const translation = index * 16 + 12;
        matrices[translation] = transition.from[i] + (transition.to[i] - transition.from[i]) * t;
        matrices[translation + 1] = transition.from[i + 1] + (transition.to[i + 1] - transition.from[i + 1]) * t;
        matrices[translation + 2] = transition.from[i + 2] + (transition.to[i + 2] - transition.from[i + 2]) * t;
      }
      target.instanceMatrix.needsUpdate = true;
      if (progress < 1) invalidate();
      else { tween.current = null; gl.domElement.setAttribute('data-point-motion', 'idle'); }
    }
    if (marker.current && hoverIndex >= 0) {
      target.getMatrixAt(hoverIndex, matrix);
      marker.current.position.setFromMatrixPosition(matrix);
    }
  });
  return <>
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}
      onClick={event => {
        const point = event.instanceId === undefined ? undefined : points[event.instanceId];
        if (point && event.delta < 5) { event.stopPropagation(); onSelect(point.source.rowId); }
      }}
      onPointerMove={event => {
        event.stopPropagation();
        onHover(event.instanceId === undefined ? null : points[event.instanceId]?.source ?? null);
      }}
      onPointerOut={() => onHover(null)}>
      <sphereGeometry args={[.08, 10, 8]}/><meshBasicMaterial toneMapped={false}/>
    </instancedMesh>
    <group ref={marker} visible={hoverIndex >= 0}>
      <mesh raycast={() => {}}>
        <sphereGeometry args={[.16, 12, 10]}/>
        <meshBasicMaterial color={colors.palette.axes[0]} transparent opacity={.78} toneMapped={false}/>
      </mesh>
    </group>
  </>;
}
function Projection({ position }: { position: [number, number, number] }) {
  const endpoints: [number, number, number][] = [[position[0], -4, position[2]], [-4, position[1], position[2]], [position[0], position[1], -4]];
  return <>{endpoints.map((end, index) => {
    const a = new Vector3(...position), b = new Vector3(...end), center = a.clone().add(b).multiplyScalar(.5);
    const object = new Object3D(); object.position.copy(center); object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return <mesh key={index} position={object.position} quaternion={object.quaternion}><cylinderGeometry args={[.012, .012, a.distanceTo(b), 6]}/><meshBasicMaterial color="#f6d487"/></mesh>;
  })}</>;
}
function ContextLifecycle({onReady}:{onReady(ready:boolean):void}) {
  const {gl,invalidate}=useThree();
  useEffect(()=>{
    const canvas=gl.domElement;
    const lost=(event:Event)=>{event.preventDefault();onReady(false);};
    const restored=()=>{onReady(true);invalidate();};
    canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);onReady(true);
    return()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);};
  },[gl,invalidate,onReady]);
  return null;
}
export function WebGLScatter({ points, axes, labels, colors, selected, onSelect }: ScatterRenderProps) {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [command, setCommand] = useState<CameraCommand>({ kind: 'reset' });
  const model=useMemo(()=>scatterModel(points,axes),[points,axes]),plotted=model.points;
  const ranges=model.min.map((value,index)=>Number.isFinite(value)?value.toLocaleString('vi-VN',{maximumSignificantDigits:6})+' → '+model.max[index].toLocaleString('vi-VN',{maximumSignificantDigits:6}):'N/A');
  const [hover, setHover] = useState<ScatterPoint | null>(null), [pinned, setPinned] = useState<string>();
  const [projection, setProjection] = useState(false), [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const active = plotted.find(point => point.source.rowId === (hover?.rowId ?? pinned ?? selected));
  const inspected = active?.source;
  return <div className="webgl-scatter">
    <p className="muted">Kéo để xoay · Cuộn để zoom · Rê chuột để xem · Click để ghim và mở dòng. Co giãn trục chỉ phục vụ hiển thị.</p>
    <div className="scene-canvas" role="group" aria-label="Biểu đồ 3D tương tác" data-testid="webgl-scene" data-ready={ready} data-active-row={inspected?.rowId ?? ''}>
      <Canvas camera={{ position: [12, 11, 13], fov: 44 }} frameloop="demand" dpr={[1, 1.5]} onCreated={({ gl }) => {
        gl.domElement.setAttribute('aria-label', 'Không gian WebGL 3D');
      }} fallback={<p>WebGL không được hỗ trợ. Chọn hình chiếu tương thích phía trên.</p>}>
        <color attach="background" args={[colors.palette.background]}/>
        <ContextLifecycle onReady={setReady}/>
        <gridHelper args={[8, 16, colors.palette.axes[0], colors.palette.grid]} position={[0, -4, 0]}/>
        <gridHelper args={[8, 8, colors.palette.grid, colors.palette.grid]} position={[0, 0, -4]} rotation={[Math.PI/2,0,0]}/>
        <CoordinateAxes model={model} labels={labels} colors={colors}/>
        <PointCloud points={plotted} selected={selected} hovered={hover?.rowId} reduce={reduce} colors={colors} onSelect={id => { setPinned(id); onSelect(id); }} onHover={point => setHover(prior => prior?.rowId === point?.rowId ? prior : point)}/>
        {projection && active && <Projection position={active.position}/>}
        <Camera command={command} reduce={reduce}/>
      </Canvas>
      <span className="scene-label scene-x">X · {labels[0]}</span><span className="scene-label scene-y">Y · {labels[1]}</span><span className="scene-label scene-z">Z · {labels[2]}</span>
      {inspected && <div className="scene-tooltip"><strong>{inspected.rowId === pinned ? 'Đã ghim' : 'Đang xem'} · {inspected.rowId}</strong><span>X {inspected.x} · Y {inspected.y} · Z {inspected.z}</span><span>Missing {inspected.missingCount} · {inspected.isOutlier ? 'Có outlier' : 'Không outlier'}</span></div>}
    </div>
    {!ready && <p className="notice">Đang khởi tạo WebGL hoặc đã mất ngữ cảnh đồ họa. Có thể dùng hình chiếu tương thích và danh sách điểm.</p>}
    <div className="axis-legend">{labels.map((label,index)=><span key={index}><strong>{['X','Y','Z'][index]} · {label}</strong><small>{ranges[index]} · toàn phiên bản</small></span>)}</div>
    <div className="scene-toolbar"><label className="check"><input type="checkbox" checked={projection} onChange={event => setProjection(event.target.checked)}/>Chiếu điểm xuống mặt phẳng</label>
      <Button variant="secondary" disabled={!pinned} onClick={() => setPinned(undefined)}>Bỏ ghim</Button>
      <Button variant="secondary" disabled={!selected} onClick={() => setPinned(selected)}>Ghim dòng đang chọn</Button>
      <Button variant="secondary" onClick={() => setCommand({ kind: 'turn', amount: -Math.PI / 12 })}>Xoay trái</Button><Button variant="secondary" onClick={() => setCommand({ kind: 'turn', amount: Math.PI / 12 })}>Xoay phải</Button>
      <Button variant="secondary" onClick={() => { setZoom(1); setCommand({ kind: 'reset' }); }}>Đặt lại góc nhìn</Button>
      <Button variant="secondary" disabled={!active} onClick={() => { if (active) setCommand({ kind: 'focus', point: active.position }); }}>Lấy nét điểm</Button>
      <label>Thu phóng<input aria-label="Thu phóng 3D" type="range" min=".5" max="2" step=".1" value={zoom} onChange={event => { const amount = Number(event.target.value); setZoom(amount); setCommand({ kind: 'zoom', amount }); }}/></label>
    </div>
  </div>;
}
