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
  rings: THREE.Object3D[];
  mark: THREE.Object3D | null;
}

/* 已探索星標：共用幾何與材質（8 面），每座已逛過的島一個 */
const MARK_GEO = new THREE.OctahedronGeometry(0.32, 0);
const MARK_MAT = new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false });

/* ───────── 篩選聚光：緊貼底座外緣的細線星芒法陣＋緩緩上升的微光粒子 ─────────
 * 全部由著色器即時計算（不用 Canvas 漸層貼圖，避免 iOS 抖動雜點）；所有島共用同一組幾何與著色器程式，
 * 每座島只有 2 次繪製，且只在亮起時繪製。 */
const SPOT_R = 3.15;
const SPOT_GEO = new THREE.PlaneGeometry(SPOT_R * 2, SPOT_R * 2).rotateX(-Math.PI / 2);
const SPOT_VERT = /* glsl */ `precision highp float;
varying vec2 vP;
void main() { vP = position.xz / ${SPOT_R.toFixed(2)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SPOT_FRAG = /* glsl */ `precision highp float;
uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
varying vec2 vP;
float line(float d, float w) { return 1.0 - smoothstep(0.0, w, abs(d)); }
void main() {
  float r = length(vP);
  if (r > 1.0) discard;
  float a = atan(vP.y, vP.x);
  float aw = a + uTime * 0.18;                       // 外環緩慢順轉
  float ar = a - uTime * 0.11;                       // 內環反轉
  float outer = line(r - 0.955, 0.012);
  float halo = exp(-pow((r - 0.955) / 0.05, 2.0)) * 0.35;
  float dash = line(r - 0.86, 0.006) * step(0.45, fract(ar * 24.0 / 6.2831853));
  float ticks = line(r - 0.905, 0.028) * line(fract(aw * 36.0 / 6.2831853) - 0.5, 0.06) ;
  float majors = line(r - 0.9, 0.05) * line(fract(aw * 4.0 / 6.2831853) - 0.5, 0.012);
  // 八道細星芒：由內向外漸淡
  float k = abs(sin((a + uTime * 0.05) * 4.0));
  float rays = (1.0 - smoothstep(0.0, 0.012 / max(r, 0.05), k)) * smoothstep(0.25, 0.4, r) * (1.0 - smoothstep(0.6, 0.84, r)) * 0.55;
  float v = outer + halo + dash * 0.7 + ticks * 0.6 + majors * 0.9 + rays;
  gl_FragColor = vec4(uColor * v * uOpacity, 1.0);
}`;
const spotMat = (color: string) => new THREE.ShaderMaterial({
  vertexShader: SPOT_VERT, fragmentShader: SPOT_FRAG, transparent: true, depthWrite: false, toneMapped: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
});
/* 上升微光：沿底座外緣隨機分布，往上飄並淡出 */
const MOTE_N = 22;
const MOTE_GEO = (() => {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(MOTE_N * 3), seed = new Float32Array(MOTE_N);
  const rnd = mulberry32(9);
  for (let i = 0; i < MOTE_N; i++) {
    const a = rnd() * Math.PI * 2, r = 2.2 + rnd() * 0.9;
    pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3);
    seed[i] = rnd();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  return g;
})();
const MOTE_VERT = /* glsl */ `precision highp float;
uniform float uTime; uniform float uPx;
attribute float aSeed; varying float vA;
void main() {
  float u = fract(uTime * (0.12 + aSeed * 0.1) + aSeed * 7.13);
  vec3 p = position + vec3(sin(uTime * 0.7 + aSeed * 30.0) * 0.12, u * 3.4, 0.0);
  vA = smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.55, 1.0, u));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (0.6 + aSeed * 0.8) * (40.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const MOTE_FRAG = /* glsl */ `precision highp float;
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.1, 0.5, d)) * vA * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35) * a, 1.0);
}`;
const moteMat = (color: string) => new THREE.ShaderMaterial({
  vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, toneMapped: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio || 1, 1.5) * 3 } },
});

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
  const mats = useMemo(() => [spotMat(accent), moteMat(accent)], [accent]);
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
      <mesh ref={(r) => { if (r) body.rings[0] = r; }} geometry={SPOT_GEO} material={mats[0]} position={[0, -0.32, 0]} visible={false} renderOrder={3} raycast={() => null} />
      <points ref={(r) => { if (r) body.rings[1] = r; }} geometry={MOTE_GEO} material={mats[1]} position={[0, -0.3, 0]} visible={false} renderOrder={3} raycast={() => null} frustumCulled={false} />
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
        // 柔和呼吸：法陣亮度 0.7–1.0 緩慢起伏
        const u = ((r as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = t;
        u.uOpacity.value = b.glow * (k === 0 ? 0.85 + 0.15 * Math.sin(t * 1.6 + b.phase[1]) : 0.9);
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
  // QA：tools/qa 可讀取各島目前的位置與篩選目標
  useEffect(() => { (window as unknown as { __mapBodies?: unknown }).__mapBodies = { bodies, ids }; }, [bodies, ids]);

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
    // 依鏡頭目前的水平方位旋轉格位，讓「前後拉開」對準實際的視線方向
    const cam = cameraRef.current;
    const tg = controls.current?.target;
    const az = cam ? Math.atan2(cam.position.x - (tg?.x ?? 0), cam.position.z - (tg?.z ?? 0)) : 0;
    const rot = new THREE.Matrix4().makeRotationY(az);
    const slots = clusterSlots(hit.filter(Boolean).length, portrait).map((v) => v.applyMatrix4(rot));
    // 由中心往外的每個格位，指派給目前離它最近的島（移動距離短、不交錯）
    const free = bodies.map((_, i) => i).filter((i) => hit[i]);
    const goals = new Map<number, THREE.Vector3>();
    slots.forEach((s) => {
      let best = 0, bd = Infinity;
      free.forEach((i, j) => { const d = bodies[i].anchor.distanceToSquared(s); if (d < bd) { bd = d; best = j; } });
      goals.set(free.splice(best, 1)[0], s);
    });
    bodies.forEach((b, i) => {
      b.vel.set(0, 0, 0);
      b.goalUntil = Infinity;
      if (hit[i]) {
        b.goal = goals.get(i)!;
        b.dimTo = 1; b.glowTo = 1;
      } else {
        const h = tmp.set(b.home.x, 0, b.home.z);
        const len = Math.max(h.length(), 0.001);
        // 退到聚攏群外圈更遠處並下沉，不和亮起的島在畫面上疊在一起
        const out = Math.max(len, 9) + 20;
        b.goal = new THREE.Vector3((h.x / len) * out, -6, (h.z / len) * out);
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
        autoRotate={!reducedMotion && !hovered && !flying && filter === 'all'}
        autoRotateSpeed={0.2}
      />
    </Canvas>
  );
}

/**
 * 選取法陣預熱：首頁載入約 3 秒後，在背景把每座島的法陣貼圖畫好、著色器編譯好並上傳 GPU，
 * 第一次滑過島嶼時就不會因為同步編譯或繪製 512px 貼圖而卡一下。完成後卸載。
 */
const warmSpot = spotMat('#ffffff');
const warmMote = moteMat('#ffffff');

/**
 * 篩選聚攏的格位：六角蜂巢排列，相鄰島中心距 CLUSTER_GAP（島 4×4、半對角約 2.9，法陣半徑 3.15 → 光環彼此不重疊、留呼吸空間）。
 * 取離中心最近的 n 格；橫向螢幕優先往左右展開、直向螢幕往前後展開。
 */
const CLUSTER_GAP = 7.6;
function clusterSlots(n: number, portrait: boolean): THREE.Vector3[] {
  if (n <= 0) return [];
  if (n === 1) return [new THREE.Vector3(0, 0.6, portrait ? 0 : -1.5)];
  if (n === 2) return [-1, 1].map((s) => (portrait ? new THREE.Vector3(0, 0.6, (s * CLUSTER_GAP * 1.1) / 2) : new THREE.Vector3((s * CLUSTER_GAP) / 2, 0.6, 0)));
  const pts: THREE.Vector3[] = [];
  const h = CLUSTER_GAP * Math.sqrt(3) / 2;
  // 三島以上：以三角形重心為中心的蜂巢（三座時剛好是正三角形，不會有一座孤立在中央）
  const off = n === 3 ? [CLUSTER_GAP / 2, h / 3] : [0, 0];
  for (let r = -4; r <= 4; r++) for (let c = -4; c <= 4; c++) {
    const x = (c + (r & 1 ? 0.5 : 0)) * CLUSTER_GAP - off[0], z = r * h - off[1];
    // 橫向鏡頭俯角約 32°，前後距離在畫面上被壓扁 → 前後方向多拉開 15%，光環（橢圓）在畫面上也不相疊；
    // 整群往鏡頭反方向退 2.5，前排不會被下方的篩選列擋住
    pts.push(portrait ? new THREE.Vector3(z, 0.6, x * 1.1) : new THREE.Vector3(x, 0.6, z * 1.15 - 2.5));
  }
  const kx = portrait ? 1.35 : 1.0; // 橫向螢幕讓 x 方向「比較近」→ 往左右展開
  const zc = portrait ? 0 : -2.5;
  pts.sort((a, b) => (a.x * kx) ** 2 + (a.z - zc) ** 2 - ((b.x * kx) ** 2 + (b.z - zc) ** 2));
  return pts.slice(0, n);
}
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
      <mesh geometry={SPOT_GEO} material={warmSpot} />
      <points geometry={MOTE_GEO} material={warmMote} frustumCulled={false} />
    </group>
  );
}
