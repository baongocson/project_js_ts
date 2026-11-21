import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Vector3, type Mesh, type PointLight, type Points, type PointsMaterial } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useMediaQuery } from '../../../shared/ui/useMediaQuery';

const nodeCount = 112;
const golden = Math.PI * (3 - Math.sqrt(5));
const nodes = Array.from({ length: nodeCount }, (_, index) => {
  const y = 1 - 2 * (index + .5) / nodeCount;
  const radius = Math.sqrt(1 - y * y);
  return new Vector3(radius * Math.cos(golden * index), y, radius * Math.sin(golden * index)).multiplyScalar(1.57);
});
const edges = nodes.flatMap((a, i) => nodes.slice(i + 1).filter(b => a.distanceToSquared(b) < .44).map(b => [a, b]));
const pulses = edges.filter((_, i) => i % 17 === 0).slice(0, 16);
const edgePositions = new Float32Array(edges.flatMap(edge => edge.flatMap(position => position.toArray())));
const nodePositions = [0, 1, 2].map(group => new Float32Array(nodes.filter((_, index) => index % 3 === group).flatMap(position => position.toArray())));
const stars = new Float32Array(Array.from({ length: 54 }, (_, i) => {
  const angle = i * golden, radius = 2 + (i % 11) * .1;
  return [Math.cos(angle) * radius, Math.sin(angle * 2) * 2.1, Math.sin(angle) * radius];
}).flat());

function Controls({ motion, command }: { motion: boolean; command: { kind: string } }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const interacting = useRef(false);
  const resumeAt = useRef(0);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.minDistance = 3.4;
    orbit.maxDistance = 8;
    orbit.enablePan = false;
    orbit.dampingFactor = .075;
    const start = () => { interacting.current = true; };
    const end = () => { interacting.current = false; resumeAt.current = performance.now() + 1400; };
    orbit.addEventListener('start', start);
    orbit.addEventListener('end', end);
    const change = () => invalidate();
    orbit.addEventListener('change', change);
    const reset = () => { orbit.reset(); invalidate(); };
    gl.domElement.addEventListener('dblclick', reset);
    return () => {
      gl.domElement.removeEventListener('dblclick', reset);
      orbit.removeEventListener('change', change);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!controls.current) return;
    controls.current.enableDamping = motion;
  }, [motion]);
  useEffect(() => {
    if (command.kind === 'reset') controls.current?.reset();
    if (command.kind === 'in' || command.kind === 'out') {
      camera.position.setLength(Math.min(8, Math.max(3.4, camera.position.length() * (command.kind === 'in' ? .85 : 1.18))));
      controls.current?.update();
    }
    if (command.kind === 'left' || command.kind === 'right') {
      camera.position.applyAxisAngle(new Vector3(0, 1, 0), command.kind === 'left' ? -.25 : .25);
      controls.current?.update();
    }
    invalidate();
  }, [camera, command, invalidate]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || !motion) return;
    orbit.autoRotate = !interacting.current && performance.now() > resumeAt.current;
    orbit.autoRotateSpeed = .38;
    orbit.update(Math.min(delta, .05));
  });
  return null;
}

function Network({ light, motion, hovered }: { light: boolean; motion: boolean; hovered: boolean }) {
  const spark = useRef<Points>(null);
  const ambient = useRef<Points>(null);
  const rim = useRef<PointLight>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const nodeMaterials = useRef<(PointsMaterial | null)[]>([]);
  const colors = light ? ['#e5b958', '#516b9a', '#aa7622'] : ['#70f4ff', '#427cff', '#ae62ff'];
  const geometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pulses.flatMap(([a]) => a.toArray()), 3));
    return geometry;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }, delta) => {
    if (!motion) return;
    const time = clock.elapsedTime;
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      const direction = index === 1 ? -1 : 1;
      ring.rotation.y += Math.min(delta, .05) * (.08 + index * .04) * direction;
      ring.rotation.x += Math.min(delta, .05) * (.03 + index * .03) * -direction;
    });
    const positions = geometry.getAttribute('position');
    pulses.forEach(([a, b], index) => {
      const t = (time * (.26 + index % 4 * .06) + index * .38) % 1;
      positions.setXYZ(index, a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t, a.z + (b.z-a.z)*t);
    });
    positions.needsUpdate = true;
    if (spark.current) (spark.current.material as PointsMaterial).opacity = .65 + .27 * Math.sin(time * 2.3);
    nodeMaterials.current.forEach((material, index) => {
      if (material) material.opacity = .77 + .19 * Math.sin(time * (.92 + index * .37) + index * 2);
    });
    if (ambient.current) ambient.current.rotation.y += Math.min(delta, .05) * .042;
    if (rim.current) rim.current.intensity += ((hovered ? 22 : 14) - rim.current.intensity) * .1;
  });
  return <>
    <hemisphereLight args={[light ? "#ffedb5" : "#77b6f8", light ? "#977948" : "#6339a3", .8]} />
    <pointLight position={[-3, 3.2, 4]} color={colors[0]} intensity={26} />
    <pointLight ref={rim} position={[3, -1, 3]} color={colors[2]} intensity={motion ? 14 : hovered ? 22 : 14} />
    <mesh>
      <sphereGeometry args={[1.52, 48, 32]} />
      <meshStandardMaterial color={light ? '#263958' : '#101b3c'} metalness={.35} roughness={.44} emissive="#111b39" emissiveIntensity={.26} />
    </mesh>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[edgePositions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={colors[0]} transparent opacity={.34} />
    </lineSegments>
    {colors.map((color, group) => <points key={group}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[nodePositions[group], 3]} /></bufferGeometry>
      <pointsMaterial ref={material => { nodeMaterials.current[group] = material; }} color={color} size={.044} transparent />
    </points>)}
    <points ref={spark} geometry={geometry}><pointsMaterial color={colors[0]} size={.075} transparent opacity={.85} /></points>
    <points ref={ambient}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry>
      <pointsMaterial color={colors[2]} size={.027} transparent opacity={.55} />
    </points>
    {[.85, 1.47, -.55].map((angle, index) => <mesh key={angle} ref={mesh => { rings.current[index] = mesh; }} rotation={[angle, index * .45, .25]}>
      <torusGeometry args={[1.92 + .17 * index, .008, 6, 96]} />
      <meshBasicMaterial color={colors[index]} transparent opacity={.58} />
    </mesh>)}
  </>;
}

function Ready({ report }: { report(value: boolean): void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); report(false); };
    const restored = () => report(true);
    gl.domElement.addEventListener('webglcontextlost', lost);
    gl.domElement.addEventListener('webglcontextrestored', restored);
    report(true);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      gl.domElement.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, report]);
  return null;
}

function supportsWebGL() {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}
let webGLAvailable: boolean | undefined;

function InteractiveGlobe() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [visible, setVisible] = useState(!document.hidden);
  const [light, setLight] = useState(document.documentElement.dataset.theme === 'light');
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [command, setCommand] = useState({ kind: '' });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    const observer = new MutationObserver(() => setLight(document.documentElement.dataset.theme === 'light'));
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    return () => { document.removeEventListener('visibilitychange', update); observer.disconnect(); };
  }, []);
  const motion = ready && visible && !reduced && !paused;
  return <div className="auth-globe" data-ready={ready} role="group" aria-label="Quả cầu dữ liệu 3D">
    <div className="auth-globe-canvas" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <Canvas camera={{ position: [0, .8, 5.85], fov: 46 }} dpr={[1, 1.35]} frameloop={motion ? 'always' : 'demand'}
        fallback={null} gl={{ alpha: true, powerPreference: 'low-power' }}>
        <Ready report={setReady} />
        <Controls motion={motion} command={command} />
        <Network motion={motion} hovered={hovered} light={light} />
      </Canvas>
    </div>
    {ready && <div className="auth-globe-controls" aria-label="Điều khiển quả cầu">
      {([['left','Xoay trái','←'],['right','Xoay phải','→'],['in','Phóng to','+'],['out','Thu nhỏ','−'],['reset','Đặt lại quả cầu','↺']] as const).map(([kind, label, icon]) =>
        <button className="button secondary" key={kind} type="button" aria-label={label} title={label} onClick={() => setCommand({ kind })}>{icon}</button>)}
      {!reduced && <button className="button secondary" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>Tạm dừng</button>}
    </div>}
  </div>;
}

export default function AuthGlobe() {
  const [supported] = useState(() => webGLAvailable ??= supportsWebGL());
  return supported ? <InteractiveGlobe /> : null;
}
