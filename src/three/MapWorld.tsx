/**
 * 首頁：3D 浮空微縮群島。每件作品是一座懸浮在「萬界匯聚」星雲中的箱庭島嶼。
 * - 群島自然錯落，各自以不同頻率在三軸上漂浮（無重力感）
 * - 拖曳空白處旋轉視角 / 滾輪縮放；按住島嶼拖動可移動它，放開後帶慣性滑行
 * - 懸停：島嶼浮起，底下出現依風格設計的選取法陣與名稱標籤
 * - 點擊：鏡頭平滑飛向島嶼，再切換到作品介紹頁
 * 效能：dpr 上限 1.5、幾何與材質全站共用、群島不使用點光源。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, PerformanceMonitor, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { Diorama } from './dioramas';
import { ACCENT, DEFAULT_BUILDING } from './kinds';
import { allowEffects, Effects } from './world';
import { DustLayers, NebulaDome, WorldFragments } from './cosmos';
import { Sigil, SIGIL_FOR_THEME, type SigilKind } from './sigils';
import { mulberry32 } from '../lib/useCanvasLoop';

export interface MapWorldProps {
  projects: Project[];
  portrait: boolean;
  reducedMotion: boolean;
  /** 鏡頭飛抵後呼叫；screen = 島嶼在螢幕上的位置（給 2D 轉場做焦點） */
  onEnter: (id: string, screen: { x: number; y: number }) => void;
  /** 回報每座島在螢幕上的位置（返回大地圖時的鏡頭焦點） */
  onMeasure: (id: string, screen: { x: number; y: number }) => void;
}

/* ───────────────── 群島佈局：自然錯落的 3D 散佈 ───────────────── */
function scatter(n: number, portrait: boolean): THREE.Vector3[] {
  const rnd = mulberry32(2026);
  const out: THREE.Vector3[] = [];
  const rx = portrait ? 6.5 : 17, rz = portrait ? 19 : 10.5;
  let tries = 0;
  while (out.length < n && tries < 4000) {
    tries++;
    const p = new THREE.Vector3((rnd() * 2 - 1) * rx, (rnd() - 0.5) * 4.2, (rnd() * 2 - 1) * rz);
    if ((p.x / rx) ** 2 + (p.z / rz) ** 2 > 1) continue;
    const minD = tries > 2500 ? 5.5 : 7.2;
    if (out.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > minD)) out.push(p);
  }
  while (out.length < n) out.push(new THREE.Vector3((out.length % 5) * 6 - 12, 0, 14 + Math.floor(out.length / 5) * 6));
  return out;
}

/** 每座島的物理狀態（不經過 React，逐幀直接更新） */
interface Body {
  anchor: THREE.Vector3;   // 漂浮中心（拖曳會改變它）
  vel: THREE.Vector3;      // 放開後的慣性速度
  freq: [number, number, number];
  phase: [number, number, number];
  amp: [number, number, number];
  yaw: number;
  group: THREE.Group | null;
  lift: number;
}

const tmp = new THREE.Vector3();
const plane = new THREE.Plane();
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function Island({
  project, body, hovered, sigil, onOver, onOut, onDown,
}: {
  project: Project; body: Body; hovered: boolean; sigil: SigilKind;
  onOver: (id: string) => void; onOut: () => void; onDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  const theme = themes[project.theme];
  return (
    <group
      ref={(g) => { if (g && !body.group) g.position.copy(body.anchor); body.group = g; }}
      onPointerOver={(e) => { e.stopPropagation(); onOver(project.id); }}
      onPointerOut={onOut}
      onPointerDown={(e) => onDown(project.id, e)}
    >
      <group rotation={[0, body.yaw, 0]}>
        <Diorama kind={kind} accent={accent} model={project.model} lod />
      </group>
      {hovered && (
        <>
          <Sigil kind={sigil} color={accent} />
          <Html position={[0, 5.4, 0]} center distanceFactor={22} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="island-tag" style={{ ['--c' as string]: accent }}>
              <b>{project.title}</b>
              <small>{theme.label}{project.status === 'dev' ? ' · 開發中' : project.status === 'maintenance' ? ' · 維修中' : ''}</small>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

/** 群島物理：多軸漂浮、拖曳跟隨、放開後慣性滑行、島與島柔性推開 */
function Swarm({ bodies, drag, hovered, reduced }: { bodies: Body[]; drag: MutableRefObject<DragState | null>; hovered: string | null; reduced: boolean }) {
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const d = drag.current;
    bodies.forEach((b, i) => {
      const dragging = d?.dragging && d.index === i;
      if (dragging) {
        // 跟隨滑鼠（彈簧），同時估算速度供放開後使用
        const prev = tmp.copy(b.anchor);
        b.anchor.lerp(d!.target, 1 - Math.pow(0.0005, dt));
        b.vel.copy(b.anchor).sub(prev).divideScalar(Math.max(dt, 1e-3));
      } else {
        b.anchor.addScaledVector(b.vel, dt);
        b.vel.multiplyScalar(Math.exp(-1.6 * dt));
        // 柔性邊界：太遠會被慢慢拉回
        const r = Math.hypot(b.anchor.x, b.anchor.z);
        if (r > 24) b.vel.addScaledVector(tmp.set(b.anchor.x, 0, b.anchor.z).normalize(), -(r - 24) * dt * 2);
        b.vel.y += (0 - b.anchor.y) * dt * 0.15;
      }
      // 柔性推開：避免島嶼重疊
      for (let j = i + 1; j < bodies.length; j++) {
        const o = bodies[j];
        const dx = o.anchor.x - b.anchor.x, dz = o.anchor.z - b.anchor.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001 && dist < 6.6) {
          const push = ((6.6 - dist) / 6.6) * dt * 6;
          const nx = dx / dist, nz = dz / dist;
          const draggedJ = d?.dragging && d.index === j;
          if (!dragging) { b.vel.x -= nx * push; b.vel.z -= nz * push; }
          if (!draggedJ) { o.vel.x += nx * push; o.vel.z += nz * push; }
        }
      }
      const g = b.group;
      if (!g) return;
      const isHover = hovered !== null && g.userData.id === hovered;
      b.lift += ((isHover || dragging ? 0.7 : 0) - b.lift) * Math.min(1, dt * 7);
      const m = reduced ? 0 : 1;
      g.position.set(
        b.anchor.x + Math.sin(t * b.freq[0] + b.phase[0]) * b.amp[0] * m,
        b.anchor.y + Math.sin(t * b.freq[1] + b.phase[1]) * b.amp[1] * m + b.lift,
        b.anchor.z + Math.cos(t * b.freq[2] + b.phase[2]) * b.amp[2] * m,
      );
      g.rotation.y = Math.sin(t * b.freq[0] * 0.5 + b.phase[2]) * 0.12 * m;
      g.rotation.z = Math.sin(t * b.freq[1] * 0.7 + b.phase[0]) * 0.03 * m;
    });
  });
  return null;
}

interface DragState { index: number; id: string; startX: number; startY: number; startT: number; dragging: boolean; target: THREE.Vector3; offset: THREE.Vector3 }

/** 鏡頭飛行：把相機與注視點平滑移到目標島嶼前方，抵達後回呼 */
function CameraRig({ flight, controls }: { flight: MutableRefObject<{ target: THREE.Vector3; t: number; done: () => void } | null>; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const f = flight.current;
    if (!f) return;
    f.t += dt;
    const k = 1 - Math.pow(0.0025, dt);
    const dest = tmp.copy(f.target).add(new THREE.Vector3(0, 3.2, 6.5));
    camera.position.lerp(dest, k);
    controls.current?.target.lerp(f.target, k);
    if (f.t > 0.85) {
      const done = f.done;
      flight.current = null;
      done();
    }
  });
  return null;
}

/** 定期回報各島在螢幕上的位置 */
function Projector({ bodies, ids, onMeasure }: { bodies: Body[]; ids: string[]; onMeasure: MapWorldProps['onMeasure'] }) {
  const { camera, size } = useThree();
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.5) return;
    last.current = clock.elapsedTime;
    bodies.forEach((b, i) => {
      if (!b.group) return;
      tmp.copy(b.group.position).add(new THREE.Vector3(0, 1.2, 0)).project(camera);
      onMeasure(ids[i], { x: (tmp.x * 0.5 + 0.5) * size.width, y: (-tmp.y * 0.5 + 0.5) * size.height });
    });
  });
  return null;
}

/** 拖曳控制：在 window 上追蹤指標，超過閾值才算拖曳；未拖曳的放開視為點擊 */
function DragController({ drag, bodies, controls, onTap, onRelease }: {
  drag: MutableRefObject<DragState | null>; bodies: Body[]; controls: MutableRefObject<OrbitControlsImpl | null>; onTap: (id: string) => void; onRelease: () => void;
}) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.dragging && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 7) d.dragging = true;
      if (!d.dragging) return;
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      plane.set(new THREE.Vector3(0, 1, 0), -bodies[d.index].anchor.y);
      if (ray.ray.intersectPlane(plane, tmp)) d.target.copy(tmp).sub(d.offset).setY(bodies[d.index].anchor.y);
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      if (controls.current) controls.current.enabled = true;
      gl.domElement.style.cursor = '';
      if (d.dragging) onRelease();
      else if (performance.now() - d.startT < 600) onTap(d.id);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, bodies, controls, onTap, onRelease, camera, gl]);
  return null;
}

export default function MapWorld({ projects, portrait, reducedMotion, onEnter, onMeasure }: MapWorldProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const flight = useRef<{ target: THREE.Vector3; t: number; done: () => void } | null>(null);
  const drag = useRef<DragState | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  const bodies = useMemo<Body[]>(() => {
    const rnd = mulberry32(77);
    return scatter(projects.length, portrait).map((p) => ({
      anchor: p, vel: new THREE.Vector3(), group: null, lift: 0,
      freq: [0.18 + rnd() * 0.22, 0.35 + rnd() * 0.3, 0.15 + rnd() * 0.2],
      phase: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28],
      amp: [0.35 + rnd() * 0.45, 0.25 + rnd() * 0.3, 0.35 + rnd() * 0.45],
      yaw: (rnd() - 0.5) * 1.6,
    }));
  }, [projects.length, portrait]);
  const ids = useMemo(() => projects.map((p) => p.id), [projects]);

  const enter = useCallback((id: string) => {
    if (flight.current) return;
    const b = bodies[ids.indexOf(id)];
    if (!b?.group) return;
    const world = b.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    setHovered(null);
    setFlying(true);
    const send = () => {
      tmp.copy(world).project(cameraRef.current!);
      onEnter(id, { x: (tmp.x * 0.5 + 0.5) * window.innerWidth, y: (-tmp.y * 0.5 + 0.5) * window.innerHeight });
    };
    if (reducedMotion) { send(); return; }
    flight.current = { target: world, t: 0, done: send };
  }, [bodies, ids, onEnter, reducedMotion]);

  const release = useCallback(() => setHovered(null), []);
  // QA：網址加 ?sigils 會讓所有島同時顯示選取法陣
  const showAll = useMemo(() => typeof location !== 'undefined' && new URLSearchParams(location.search).has('sigils'), []);

  const down = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    if (flying || e.button !== 0) return;
    e.stopPropagation();
    const i = ids.indexOf(id);
    const b = bodies[i];
    if (controls.current) controls.current.enabled = false;
    // 抓取點與島心的水平偏移，避免一抓就跳
    plane.set(new THREE.Vector3(0, 1, 0), -b.anchor.y);
    const hit = e.ray.intersectPlane(plane, new THREE.Vector3()) ?? b.anchor.clone();
    drag.current = { index: i, id, startX: e.clientX, startY: e.clientY, startT: performance.now(), dragging: false, target: b.anchor.clone(), offset: hit.sub(b.anchor).setY(0) };
    b.vel.set(0, 0, 0);
  }, [bodies, ids, flying]);

  // 讓 Swarm 能判斷哪座島被懸停
  bodies.forEach((b, i) => { if (b.group) b.group.userData.id = ids[i]; });

  const [low, setLow] = useState(false);
  const fx = allowEffects() && !low;
  const camPos: [number, number, number] = portrait ? [0, 46, 17] : [1.2, 19, 30];

  return (
    <Canvas
      // 以 offsetWidth/Height 量測：轉場中的 CSS scale 不會把畫布量成數倍大（先前首頁變黑的原因）
      resize={{ offsetSize: true }}
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: camPos, fov: portrait ? 52 : 40, near: 0.5, far: 320 }}
      gl={{ antialias: !fx, powerPreference: 'high-performance' }}
      onCreated={({ camera, gl }) => { cameraRef.current = camera; (window as unknown as { __mapGL?: unknown }).__mapGL = gl; }}
      onPointerMissed={() => setHovered(null)}
      style={{ cursor: hovered ? 'grab' : 'default' }}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setLow(true)} />
      <NebulaDome />
      <fog attach="fog" args={['#0b0918', 55, 140]} />
      <ambientLight color="#8a90b8" intensity={0.55} />
      <Environment resolution={128} frames={1} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.2} color="#ffe2b0" position={[0, 8, -10]} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#9fb4ff" position={[10, 3, 6]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
      </Environment>
      <hemisphereLight args={['#ffe9c4', '#1a1430', 0.55]} />
      <directionalLight
        color="#fff1d6"
        intensity={2}
        position={[14, 22, 10]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      <DustLayers />
      <WorldFragments />
      <Sparkles count={90} scale={[48, 16, 34]} position={[0, 2, 0]} size={3.2} speed={0.3} opacity={0.6} color="#f3d79a" />

      {projects.map((p, i) => (
        <Island
          key={p.id}
          project={p}
          body={bodies[i]}
          hovered={showAll || hovered === p.id}
          sigil={SIGIL_FOR_THEME[p.theme]}
          onOver={(id) => { if (!flying && !drag.current?.dragging) setHovered(id); }}
          onOut={() => { if (!drag.current?.dragging) setHovered(null); }}
          onDown={down}
        />
      ))}

      <Swarm bodies={bodies} drag={drag} hovered={hovered} reduced={reducedMotion} />
      <DragController drag={drag} bodies={bodies} controls={controls} onTap={enter} onRelease={release} />
      <CameraRig flight={flight} controls={controls} />
      <Projector bodies={bodies} ids={ids} onMeasure={onMeasure} />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!flying}
        target={portrait ? [0, 0, 1.2] : [0, 1.5, 0]}
        enableDamping
        dampingFactor={0.07}
        enablePan={false}
        minDistance={10}
        maxDistance={portrait ? 75 : 55}
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
        autoRotate={!reducedMotion && !hovered && !flying}
        autoRotateSpeed={0.2}
      />
      {fx && <Effects bloom={0.9} />}
    </Canvas>
  );
}
