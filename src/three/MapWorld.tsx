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
import { Diorama } from './Diorama';
import { finishPrograms, mapModel, preloadModels } from './assets';
import { ACCENT } from './kinds';
import { GL_OPTS } from './world';
import { DustLayers, NebulaDome, WorldFragments } from './cosmos';
import { Sigil, SIGIL_FOR_THEME, type SigilKind } from './sigils';
import { mulberry32 } from '../lib/random';
import { play } from '../lib/sound';

/** 首頁分類聚光燈：'all'、'cat:personal'、'cat:campus' 或 'theme:<主題>' */
export type MapFilter = string;
export const matchFilter = (p: Project, f: MapFilter) =>
  f === 'all' || f === `cat:${p.category}` || f === `theme:${p.theme}`;

export interface MapWorldProps {
  projects: Project[];
  portrait: boolean;
  reducedMotion: boolean;
  /** 鏡頭飛抵後呼叫；screen = 島嶼在螢幕上的位置（給 2D 轉場做焦點） */
  onEnter: (id: string, screen: { x: number; y: number }) => void;
  /** 回報每座島在螢幕上的位置（返回大地圖時的鏡頭焦點） */
  onMeasure: (id: string, screen: { x: number; y: number }) => void;
  /** 離場轉場中停止渲染（凍結最後一幀），把 GPU 讓給正在載入的介紹頁 */
  live?: boolean;
  /** 分類聚光燈篩選 */
  filter?: MapFilter;
  /** 探索護照：已逛過的島（上方顯示小星標） */
  visited?: string[];
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
  home: THREE.Vector3;          // 初始散佈位置（「全部」時緩緩回到這裡）
  goal: THREE.Vector3 | null;   // 篩選時的聚攏 / 退後目標
  goalUntil: number;            // 目標有效期限（秒，performance 時間）；篩選中為 Infinity
  dim: number; dimTo: number;   // 亮度（1 正常、退後的島變暗）
  glow: number; glowTo: number; // 選中光環強度
  rings: THREE.Mesh[];
  mark: THREE.Object3D | null;
}

/* 已探索星標：共用幾何與材質（8 面），每座已逛過的島一個 */
const MARK_GEO = new THREE.OctahedronGeometry(0.32, 0);
const MARK_MAT = new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false });

/* 選中光環：共用幾何，每座島各一組加色材質；強度 0 時不繪製 */
const RING_IN = new THREE.RingGeometry(3.25, 3.5, 72);
const RING_OUT = new THREE.RingGeometry(3.55, 4.7, 72);
const ringMat = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

/** 依亮度係數調整島上所有材質（保存原色，離開首頁時還原） */
function shade(g: THREE.Object3D, k: number) {
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || !(o as THREE.Mesh).isMesh || !m.color || m.userData.noDim) return;
    const u = m.userData as { baseColor?: THREE.Color; baseEmissive?: THREE.Color; dimK?: number };
    if (u.dimK === k) return;
    if (!u.baseColor) { u.baseColor = m.color.clone(); if (m.emissive) u.baseEmissive = m.emissive.clone(); }
    m.color.copy(u.baseColor).multiplyScalar(k);
    if (u.baseEmissive) m.emissive.copy(u.baseEmissive).multiplyScalar(k);
    u.dimK = k;
  });
}

const tmp = new THREE.Vector3();
const FLY_OFFSET = new THREE.Vector3(0, 3.2, 6.5);
const LIFT_UP = new THREE.Vector3(0, 1.2, 0);
const plane = new THREE.Plane();
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function Island({
  project, body, hovered, sigil, seen, onOver, onOut, onDown,
}: {
  project: Project; body: Body; hovered: boolean; sigil: SigilKind; seen: boolean;
  onOver: (id: string) => void; onOut: () => void; onDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const accent = project.accent ?? ACCENT[project.theme];
  const theme = themes[project.theme];
  const mats = useMemo(() => { const a = ringMat(accent), b = ringMat(accent); a.userData.noDim = b.userData.noDim = true; return [a, b]; }, [accent]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <group
      ref={(g) => { if (g && !body.group) g.position.copy(body.anchor); body.group = g; }}
      onPointerOver={(e) => { e.stopPropagation(); onOver(project.id); }}
      onPointerOut={onOut}
      onPointerDown={(e) => onDown(project.id, e)}
    >
      <group rotation={[0, body.yaw, 0]}>
        {project.model && <Diorama model={project.model} lod />}
      </group>
      {seen && (
        <mesh ref={(r) => { body.mark = r; }} geometry={MARK_GEO} material={MARK_MAT} position={[0, 4.7, 0]} scale={[1, 1.5, 1]} visible={!hovered} raycast={() => null} />
      )}
      {mats.map((m, k) => (
        <mesh
          key={k}
          ref={(r) => { if (r) body.rings[k] = r; }}
          geometry={k === 0 ? RING_IN : RING_OUT}
          material={m}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, k === 0 ? -0.25 : -0.3, 0]}
          visible={false}
          renderOrder={3}
          raycast={() => null}
        />
      ))}
      {hovered && (
        <>
          <Sigil kind={sigil} color={accent} />
          <Html position={[0, 5.4, 0]} center distanceFactor={22} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="island-tag" style={{ ['--c' as string]: accent }}>
              <b>{project.title}</b>
              <small>{theme.label}{project.status === 'dev' ? ' · 開發中' : project.status === 'maintenance' ? ' · 維修中' : ''}</small>
              {seen && <span className="island-seen">✦ 已探索</span>}
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
    const now = performance.now() / 1000;
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
        if (b.goal && now < b.goalUntil) {
          // 篩選：緩緩聚攏到畫面中央 / 退到外圈（指數趨近，不會過衝）
          b.anchor.lerp(b.goal, 1 - Math.exp(-1.25 * dt));
        } else {
          b.goal = null;
          // 柔性邊界：太遠會被慢慢拉回
          const r = Math.hypot(b.anchor.x, b.anchor.z);
          if (r > 24) b.vel.addScaledVector(tmp.set(b.anchor.x, 0, b.anchor.z).normalize(), -(r - 24) * dt * 2);
          b.vel.y += (0 - b.anchor.y) * dt * 0.15;
        }
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
      // 聚光燈：亮度、縮放與光環
      const ease = Math.min(1, dt * 2.4);
      b.dim += (b.dimTo - b.dim) * ease;
      b.glow += (b.glowTo - b.glow) * ease;
      if (Math.abs(b.dim - b.dimTo) < 0.004) b.dim = b.dimTo;
      if (Math.abs(b.glow - b.glowTo) < 0.004) b.glow = b.glowTo;
      if (b.dim !== 1 || g.userData.shaded) {
        // 量化到 1/50：材質數值不變時 shade 直接略過；模型晚到時也會補上
        const k = Math.round(b.dim * 50) / 50;
        shade(g, k);
        g.userData.shaded = k !== 1;
      }
      g.scale.setScalar(0.82 + 0.18 * b.dim);
      b.rings.forEach((r, k) => {
        r.visible = b.glow > 0.01;
        if (!r.visible) return;
        const m = r.material as THREE.MeshBasicMaterial;
        m.opacity = b.glow * (k === 0 ? 0.95 : 0.14) * (k === 0 ? 0.75 + 0.25 * Math.sin(t * 2.4) : 1);
        r.rotation.z = t * (k === 0 ? 0.25 : -0.12);
        r.scale.setScalar(1 + (k === 1 ? 0.04 * Math.sin(t * 1.6) : 0));
      });
      if (b.mark) { b.mark.rotation.y = t * 1.2; b.mark.position.y = 4.7 + Math.sin(t * 2 + b.phase[0]) * 0.15; }
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
  // 離開首頁：把變暗的材質還原（材質由模型快取共用）
  useEffect(() => () => bodies.forEach((b) => b.group && shade(b.group, 1)), [bodies]);
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
    const dest = tmp.copy(f.target).add(FLY_OFFSET);
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
      tmp.copy(b.group.position).add(LIFT_UP).project(camera);
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

export default function MapWorld({ projects, portrait, reducedMotion, onEnter, onMeasure, live = true, filter = 'all', visited = [] }: MapWorldProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  // 首頁一開就把所有島嶼的輕量版一起下載解析（各 100–300KB）；滑過某座島時預載它的精細模型與環境，點進去幾乎秒開
  useMemo(() => preloadModels(...projects.map((p) => p.model && mapModel(p.model))), [projects]);
  useEffect(() => {
    const p = projects.find((x) => x.id === hovered);
    if (p) preloadModels(p.model, p.env);
  }, [hovered, projects]);
  const [flying, setFlying] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const flight = useRef<{ target: THREE.Vector3; t: number; done: () => void } | null>(null);
  const drag = useRef<DragState | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  const bodies = useMemo<Body[]>(() => {
    const rnd = mulberry32(77);
    return scatter(projects.length, portrait).map((p) => ({
      anchor: p, vel: new THREE.Vector3(), group: null, lift: 0,
      home: p.clone(), goal: null, goalUntil: 0, dim: 1, dimTo: 1, glow: 0, glowTo: 0, rings: [], mark: null,
      freq: [0.18 + rnd() * 0.22, 0.35 + rnd() * 0.3, 0.15 + rnd() * 0.2],
      phase: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28],
      amp: [0.35 + rnd() * 0.45, 0.25 + rnd() * 0.3, 0.35 + rnd() * 0.45],
      yaw: (rnd() - 0.5) * 1.6,
    }));
  }, [projects.length, portrait]);
  const ids = useMemo(() => projects.map((p) => p.id), [projects]);

  // 分類聚光燈：符合的島亮起光環並聚到中央小圓上，其餘退到外圈、下沉變暗；回到「全部」時各自回原位
  const firstFilter = useRef(true);
  useEffect(() => {
    const now = performance.now() / 1000;
    if (filter === 'all') {
      if (firstFilter.current) { firstFilter.current = false; return; }
      bodies.forEach((b) => { b.goal = b.home.clone(); b.goalUntil = now + 4; b.dimTo = 1; b.glowTo = 0; b.vel.set(0, 0, 0); });
      return;
    }
    firstFilter.current = false;
    const hit = projects.map((p) => matchFilter(p, filter));
    const n = hit.filter(Boolean).length;
    const r = n <= 1 ? 0 : Math.max(3.8, 7.4 / (2 * Math.sin(Math.PI / n)));
    let k = 0;
    // 依目前方位角排序，聚攏時不會交錯穿過彼此
    const order = bodies.map((b, i) => ({ i, a: Math.atan2(b.anchor.z, b.anchor.x) })).sort((x, y) => x.a - y.a);
    const start = order.find((o) => hit[o.i])?.a ?? 0;
    order.forEach(({ i }) => {
      const b = bodies[i];
      b.vel.set(0, 0, 0);
      b.goalUntil = Infinity;
      if (hit[i]) {
        const a = start + (k++ / Math.max(1, n)) * Math.PI * 2;
        b.goal = new THREE.Vector3(Math.cos(a) * r * (portrait ? 0.62 : 1), 0.6, Math.sin(a) * r * (portrait ? 1.5 : 0.8));
        b.dimTo = 1; b.glowTo = 1;
      } else {
        const h = tmp.set(b.home.x, 0, b.home.z);
        const len = Math.max(h.length(), 0.001);
        const out = Math.max(len, 9) + 13;
        b.goal = new THREE.Vector3((h.x / len) * out, -3.2, (h.z / len) * out * (portrait ? 1 : 0.75));
        b.dimTo = 0.3; b.glowTo = 0;
      }
    });
  }, [filter, bodies, projects, portrait]);

  const enter = useCallback((id: string) => {
    if (flight.current) return;
    const b = bodies[ids.indexOf(id)];
    if (!b?.group) return;
    const world = b.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    play('select', projects[ids.indexOf(id)]?.theme);
    setHovered(null);
    setFlying(true);
    const send = () => {
      tmp.copy(world).project(cameraRef.current!);
      onEnter(id, { x: (tmp.x * 0.5 + 0.5) * window.innerWidth, y: (-tmp.y * 0.5 + 0.5) * window.innerHeight });
    };
    if (reducedMotion) { send(); return; }
    flight.current = { target: world, t: 0, done: send };
  }, [bodies, ids, onEnter, reducedMotion, projects]);

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
  const camPos: [number, number, number] = portrait ? [0, 46, 17] : [1.2, 19, 30];

  return (
    <Canvas
      // 以 offsetWidth/Height 量測：轉場中的 CSS scale 不會把畫布量成數倍大（先前首頁變黑的原因）
      resize={{ offsetSize: true }}
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: camPos, fov: portrait ? 52 : 40, near: 0.5, far: 320 }}
      gl={GL_OPTS}
      frameloop={live ? 'always' : 'never'}
      onCreated={({ camera, gl, scene }) => { cameraRef.current = camera; gl.debug.checkShaderErrors = import.meta.env.DEV; const w = window as unknown as { __mapGL?: unknown; __mapScene?: unknown }; w.__mapGL = gl; w.__mapScene = scene; }}
      onPointerMissed={() => setHovered(null)}
      style={{ cursor: hovered ? 'grab' : 'default' }}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setLow(true)} />
      <NebulaDome />
      <SigilWarmup items={projects.map((p) => ({ kind: SIGIL_FOR_THEME[p.theme], color: p.accent ?? ACCENT[p.theme] }))} />
      <fog attach="fog" args={['#0b0918', 55, 140]} />
      <ambientLight color="#8a90b8" intensity={0.55} />
      <Environment resolution={64} frames={1} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.2} color="#ffe2b0" position={[0, 8, -10]} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#9fb4ff" position={[10, 3, 6]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
      </Environment>
      <hemisphereLight args={['#ffe9c4', '#1a1430', 0.55]} />
      <directionalLight
        color="#fff1d6"
        intensity={2}
        position={[14, 22, 10]}
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
          seen={visited.includes(p.id)}
          onOver={(id) => { if (!flying && !drag.current?.dragging) { if (hovered !== id) play('hover', p.theme); setHovered(id); } }}
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
    </Canvas>
  );
}

/**
 * 選取法陣預熱：首頁載入約 3 秒後，在背景把每座島的法陣貼圖畫好、著色器編譯好並上傳 GPU，
 * 第一次滑過島嶼時就不會因為同步編譯或繪製 512px 貼圖而卡一下。完成後卸載。
 */
const warmRing = ringMat('#ffffff');
function SigilWarmup({ items }: { items: { kind: SigilKind; color: string }[] }) {
  const { gl, camera, scene } = useThree();
  const ref = useRef<THREE.Group>(null);
  const [phase, setPhase] = useState<'wait' | 'mount' | 'done'>('wait');
  useEffect(() => {
    if (phase === 'wait') { const t = window.setTimeout(() => setPhase('mount'), 3000); return () => window.clearTimeout(t); }
    if (phase !== 'mount' || !ref.current) return;
    const g = ref.current;
    let alive = true;
    // compile 只收集「可見」物件：呼叫的瞬間設為可見（收集是同步的），之後立刻藏回去，不會被畫出來
    g.visible = true;
    const job = gl.compileAsync(g, camera, scene);
    g.visible = false;
    job.catch(() => {}).then(() => {
      if (!alive) return;
      g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m?.map) gl.initTexture(m.map); });
      finishPrograms(gl as unknown as Parameters<typeof finishPrograms>[0]);
      setPhase('done');
    });
    return () => { alive = false; };
  }, [phase, gl, camera, scene]);
  if (phase !== 'mount') return null;
  const seen = new Set<string>();
  return (
    <group ref={ref} visible={false}>
      {items.filter((it) => { const k = it.kind + it.color; if (seen.has(k)) return false; seen.add(k); return true; }).map((it) => <Sigil key={it.kind + it.color} kind={it.kind} color={it.color} />)}
      <mesh geometry={RING_IN} material={warmRing} />
    </group>
  );
}
