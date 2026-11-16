/**
 * 介紹頁的全螢幕 3D 舞台：Canvas 佔滿整個視窗，箱庭不會被任何邊框裁切。
 * 空間導覽：熱點標記綁在模型各部位，點擊後鏡頭聚焦（Hotspots.tsx）。
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, useProgress } from '@react-three/drei';
import { PCFShadowMap, Raycaster, Vector3, type Group, type Mesh, type Scene } from 'three';
import type { Hotspot } from '../data/projects';
import type { MutableRefObject } from 'react';
import { CameraFocus, MarkerProjector, StageShift, type CardRefs } from './Hotspots';
import type { FxTrigger } from './ModelDiorama';

const ModelDiorama = lazy(() => import('./ModelDiorama'));
import { Diorama } from './Diorama';
import { preloadModels } from './assets';
import type { BuildingKind } from './kinds';
import { GL_OPTS, World, worldFor } from './world';

export interface DomainStageProps {
  kind: BuildingKind; accent: string; model?: string; env?: string; projectId?: string; reducedMotion: boolean;
  hotspots?: Hotspot[]; active?: number | null; onPick?: (i: number | null) => void;
  markers?: MutableRefObject<(HTMLElement | null)[]>;
  cardRefs?: MutableRefObject<CardRefs>;
  /** 每次點擊熱點都會遞增，用來重播動畫 */
  pulse?: number;
  /** 主模型與環境都預熱完成、開始淡入時呼叫 */
  onReady?: () => void;
  /** 頁面正在離場（轉場動畫中）時停止渲染，不與新頁面搶 GPU */
  live?: boolean;
  /** 本頁就緒後，趁空檔在背景預載的模型（相鄰作品） */
  preload?: string[];
}

export default function DomainStage({ kind, accent, model, env, projectId, reducedMotion, hotspots = [], active = null, onPick, markers, cardRefs, pulse = 0, onReady, preload = [], live = true }: DomainStageProps) {
  const W = worldFor(kind, projectId);
  // 主模型與環境各自預熱完成後才算就緒；就緒後在瀏覽器空檔預載相鄰作品
  const [mainReady, setMainReady] = useState(false);
  const [envReady, setEnvReady] = useState(!env);
  const onMain = useCallback(() => setMainReady(true), []);
  const onEnv = useCallback(() => setEnvReady(true), []);
  const ready = mainReady && envReady;
  useEffect(() => {
    if (!ready) return;
    onReady?.();
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    idle(() => preloadModels(...preload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const modelRef = useRef<Group>(null);
  // 自動品質：幀率持續偏低時降低解析度並關閉後製
  const [low, setLow] = useState(false);
  // 直式螢幕畫面窄，鏡頭拉遠讓整座箱庭入鏡
  const far = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 1 ? 1.75 : 1;
  const home: [number, number, number] = [10.5 * far, 6.5 * far, 10.5 * far];
  const focused = active !== null && !!hotspots[active];
  // 以「螢幕上的距離」找手指／游標附近 70px 內最近的熱點（比 3D 距離直覺：點在哪裡就選哪裡）
  const pickNearest = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!onPick || !hotspots.length) return;
    const w = e.target instanceof HTMLElement ? e.target.clientWidth : window.innerWidth;
    const hgt = e.target instanceof HTMLElement ? e.target.clientHeight : window.innerHeight;
    const v = new Vector3();
    let best = -1, bestD = 70;
    hotspots.forEach((h, i) => {
      v.set(h.at[0], h.at[1], h.at[2]).project(e.camera);
      if (v.z > 1) return;
      const d = Math.hypot((v.x - e.pointer.x) * w / 2, (v.y - e.pointer.y) * hgt / 2);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) { e.stopPropagation(); onPick(best); }
  }, [hotspots, onPick]);
  const fx = useMemo<FxTrigger | null>(() => (focused && hotspots[active!].fx ? { steps: hotspots[active!].fx!.map((s) => ({ ...s })), key: pulse, color: accent } : null), [focused, active, pulse, hotspots, accent]);
  return (
    <>
    <StageLoader done={ready} />
    <Canvas
      resize={{ offsetSize: true }}
      shadows={{ type: PCFShadowMap }}
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: home, fov: 32, near: 0.1, far: 300 }}
      onPointerMissed={() => onPick?.(null)}
      onCreated={({ gl, scene }) => { gl.debug.checkShaderErrors = import.meta.env.DEV; const w = window as unknown as { __stageGL?: unknown; __stageScene?: unknown; __orbitCheck?: unknown }; w.__stageGL = gl; w.__stageScene = scene; w.__orbitCheck = (m: number) => orbitCheck(scene, m); }}
      gl={GL_OPTS}
      frameloop={live ? 'always' : 'never'}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setLow(true)} />
      <ShadowOnDemand ready={ready} pulse={pulse} />
      <World style={W} />
      {env && (
        <Suspense fallback={null}>
          <group position={[0, -0.4, 0]}><ModelDiorama url={env} release shadows="none" onReady={onEnv} /></group>
        </Suspense>
      )}
      <ambientLight color={W.ambient} intensity={W.ambientI} />
      <hemisphereLight args={[W.hemi[0], W.hemi[1], 0.45]} />
      <directionalLight
        color={W.sun}
        intensity={W.sunI}
        position={[6, 11, 5]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={34}
      />
      {/* 直接點模型：選取離點擊位置最近的功能（拖曳旋轉不會觸發；只掛 onClick，滑鼠移動時不做射線檢測） */}
      <group position={[0, -0.4, 0]} ref={modelRef} onClick={pickNearest}>
        {model && <Diorama model={model} fx={fx} onReady={onMain} />}
      </group>
      {markers && <MarkerProjector hotspots={hotspots} markers={markers} active={active} cardRefs={cardRefs} occluders={modelRef} />}
      <CameraFocus hotspot={focused ? hotspots[active!] : null} home={home} homeTarget={[0, 0.8, 0]} />
      <StageShift focused={focused} />
      <OrbitControls
        makeDefault
        target={[0, 0.8, 0]}
        enableDamping
        dampingFactor={0.07}
        enablePan={false}
        minDistance={7}
        maxDistance={34}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.06}
        autoRotate={!reducedMotion && !focused}
        autoRotateSpeed={0.5}
      />
    </Canvas>
    </>
  );
}

/**
 * 載入遮罩：下載進度（drei useProgress）＋微光進度條；模型預熱完成後淡出並卸載。
 * 下載完成但著色器仍在預熱時，進度條停在 100% 並持續微光，不會先露出半成品。
 */
export function StageLoader({ done }: { done: boolean }) {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) { setGone(false); return; }
    const t = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(t);
  }, [done]);
  if (gone) return null;
  const pct = Math.round(active ? progress : 100);
  return (
    <div className={`stage-loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite">
      <div className="stage-loader-box">
        <span className="stage-loader-label">{pct < 100 ? `載入島嶼 ${pct}%` : '點亮島嶼中'}</span>
        <span className="stage-loader-bar"><i style={{ transform: `scaleX(${Math.max(0.04, pct / 100)})` }} /></span>
      </div>
    </div>
  );
}

/**
 * 陰影按需更新：會投射陰影的都是靜態零件（漂浮/旋轉的小零件不投射），光源也不動，
 * 所以平常不必每幀重畫陰影貼圖；只在模型進場與點擊動畫期間（約 4 秒）更新。
 */
function ShadowOnDemand({ ready, pulse }: { ready: boolean; pulse: number }) {
  const gl = useThree((s) => s.gl);
  const until = useRef(0);
  useEffect(() => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; return () => { gl.shadowMap.autoUpdate = true; }; }, [gl]);
  useEffect(() => { until.current = performance.now() + 4000; }, [ready, pulse]);
  useFrame(() => { if (performance.now() < until.current) gl.shadowMap.needsUpdate = true; });
  return null;
}

/**
 * QA：沿著自動環繞的鏡頭路徑（全景距離 × m 倍，m=1 桌機、1.75 手機直式），每 10° 從鏡頭往主體中心打射線，
 * 回報被 3D 環境擋住的角度（tools/qa/orbit.cjs 使用）。
 */
function orbitCheck(scene: Scene, m: number) {
  const env = scene.children.find((c) => c.type === 'Group' && c.children.length > 0 && c.position.y === -0.4) ?? null;
  const target = new Vector3(0, 0.8, 0);
  const ray = new Raycaster();
  const out: { deg: number; hit: number; dist: number }[] = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const a = (deg * Math.PI) / 180;
    const r = 10.5 * Math.SQRT2 * m;
    const cam = new Vector3(Math.sin(a) * r, 6.5 * m, Math.cos(a) * r);
    const dir = target.clone().sub(cam); const dist = dir.length(); dir.normalize();
    ray.set(cam, dir); ray.far = dist - 3.2;   // 只看鏡頭到主島外緣之間
    const hits = env ? ray.intersectObject(env, true).filter((h) => (h.object as Mesh).isMesh && h.object.visible) : [];
    if (hits.length) out.push({ deg, hit: +hits[0].distance.toFixed(1), dist: +dist.toFixed(1), name: hits[0].object.name, y: +hits[0].point.y.toFixed(1), at: [+hits[0].point.x.toFixed(1), +hits[0].point.z.toFixed(1)] } as never);
  }
  return out;
}
