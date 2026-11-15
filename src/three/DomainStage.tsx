/**
 * 介紹頁的全螢幕 3D 舞台：Canvas 佔滿整個視窗，箱庭不會被任何邊框裁切。
 * 空間導覽：熱點標記綁在模型各部位，點擊後鏡頭聚焦（Hotspots.tsx）。
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { PCFShadowMap } from 'three';
import type { Hotspot } from '../data/projects';
import type { MutableRefObject } from 'react';
import { CameraFocus, MarkerProjector, StageShift, type CardRefs } from './Hotspots';
import type { FxTrigger } from './ModelDiorama';

const ModelDiorama = lazy(() => import('./ModelDiorama'));
import { Diorama } from './dioramas';
import type { BuildingKind } from './kinds';
import { allowEffects, Effects, World, worldFor } from './world';

export interface DomainStageProps {
  kind: BuildingKind; accent: string; model?: string; env?: string; projectId?: string; reducedMotion: boolean;
  hotspots?: Hotspot[]; active?: number | null; onPick?: (i: number | null) => void;
  markers?: MutableRefObject<(HTMLElement | null)[]>;
  cardRefs?: MutableRefObject<CardRefs>;
  /** 每次點擊熱點都會遞增，用來重播動畫 */
  pulse?: number;
}

export default function DomainStage({ kind, accent, model, env, projectId, reducedMotion, hotspots = [], active = null, onPick, markers, cardRefs, pulse = 0 }: DomainStageProps) {
  const W = worldFor(kind, projectId);
  // 自動品質：幀率持續偏低時降低解析度並關閉後製
  const [low, setLow] = useState(false);
  const post = allowEffects() && !low;
  // 直式螢幕畫面窄，鏡頭拉遠讓整座箱庭入鏡
  const far = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 1 ? 1.75 : 1;
  const home: [number, number, number] = [10.5 * far, 6.5 * far, 10.5 * far];
  const focused = active !== null && !!hotspots[active];
  const fx = useMemo<FxTrigger | null>(() => (focused && hotspots[active!].fx ? { steps: hotspots[active!].fx!.map((s) => ({ ...s })), key: pulse, color: accent } : null), [focused, active, pulse, hotspots, accent]);
  return (
    <Canvas
      resize={{ offsetSize: true }}
      shadows={{ type: PCFShadowMap }}
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: home, fov: 32, near: 0.1, far: 300 }}
      onPointerMissed={() => onPick?.(null)}
      onCreated={({ gl }) => { (window as unknown as { __stageGL?: unknown }).__stageGL = gl; }}
      gl={{ antialias: !post, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setLow(true)} />
      <World style={W} landscape={!env} />
      {env && (
        <Suspense fallback={null}>
          <group position={[0, -0.4, 0]}><ModelDiorama url={env} release /></group>
        </Suspense>
      )}
      <ambientLight color={W.ambient} intensity={W.ambientI} />
      <hemisphereLight args={[W.hemi[0], W.hemi[1], 0.45]} />
      <directionalLight
        color={W.sun}
        intensity={W.sunI}
        position={[6, 11, 5]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={34}
      />
      <group position={[0, -0.4, 0]}>
        <Diorama kind={kind} accent={accent} model={model} lights fx={fx} />
      </group>
      {!env && <ContactShadows position={[0, -3.98, 0]} scale={18} blur={2.6} far={7} opacity={0.55} resolution={512} color="#000000" />}
      {markers && <MarkerProjector hotspots={hotspots} markers={markers} active={active} cardRefs={cardRefs} />}
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
      {post && <Effects bloom={W.bloom} />}
    </Canvas>
  );
}
