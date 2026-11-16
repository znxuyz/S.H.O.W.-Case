/**
 * 3D 世界環境：天空穹頂、指數霧、柔光層、漂浮粒子、程序化環境反射與後製。
 * 介紹頁的全螢幕舞台與首頁群島共用。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { BuildingKind } from './kinds';

export interface WorldStyle {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sparkle: string;
  bloom: number;
  ambient: string;
  ambientI: number;
  sun: string;
  sunI: number;
  hemi: [string, string];
  /** 環境反射的主色（Lightformer） */
  env: [string, string];
}

const CAMPUS: WorldStyle = {
  skyTop: '#7fb6ef', skyBottom: '#f6efe2', fog: '#dfe9ef', fogNear: 26, fogFar: 95, sparkle: '#ffffff', bloom: 0.35,
  ambient: '#ffffff', ambientI: 0.7, sun: '#fff1d6', sunI: 2.6, hemi: ['#cfe6ff', '#8b6b4a'], env: ['#ffffff', '#ffe8c4'],
};

export const WORLD: Record<BuildingKind, WorldStyle> = {
  tower: {
    skyTop: '#02040a', skyBottom: '#0b2a40', fog: '#04101c', fogNear: 18, fogFar: 58, sparkle: '#22e4ff', bloom: 1.1,
    ambient: '#3a6a8a', ambientI: 0.45, sun: '#bfe9ff', sunI: 1.5, hemi: ['#22e4ff', '#0a141e'], env: ['#22e4ff', '#ff3df2'],
  },
  altar: {
    skyTop: '#090418', skyBottom: '#3a1648', fog: '#1d0d33', fogNear: 18, fogFar: 60, sparkle: '#ffc76b', bloom: 1.1,
    ambient: '#6a4a9a', ambientI: 0.5, sun: '#ffe2b0', sunI: 1.5, hemi: ['#b98cff', '#1a0d2e'], env: ['#b98cff', '#ffc76b'],
  },
  pagoda: {
    skyTop: '#07070b', skyBottom: '#2e2a22', fog: '#17151a', fogNear: 16, fogFar: 54, sparkle: '#ffd98a', bloom: 0.95,
    ambient: '#6f7690', ambientI: 0.45, sun: '#c9d6ff', sunI: 1.3, hemi: ['#ffe9b0', '#24221d'], env: ['#c9d6ff', '#ff9a4d'],
  },
  treehouse: {
    skyTop: '#03141a', skyBottom: '#12524a', fog: '#0a2a26', fogNear: 16, fogFar: 52, sparkle: '#eaff9a', bloom: 1,
    ambient: '#5a8a7a', ambientI: 0.5, sun: '#d8fff0', sunI: 1.3, hemi: ['#9effc9', '#2a1d12'], env: ['#9effc9', '#ffcf6a'],
  },
  school: CAMPUS, hall: CAMPUS, library: CAMPUS, kiosk: CAMPUS,
  // 國小排課系統：約束空間（約束網絡、時鐘刻度環、漂浮的課表面板）
  workshop: {
    skyTop: '#030a1c', skyBottom: '#0d2a52', fog: '#071a36', fogNear: 20, fogFar: 70, sparkle: '#9fd8ff', bloom: 1.0,
    ambient: '#8fb4e8', ambientI: 0.5, sun: '#e6f0ff', sunI: 1.8, hemi: ['#9fd8ff', '#0a2244'], env: ['#9fd8ff', '#ffc24a'],
  },
};

/** 依專案指定的世界（覆寫依造型決定的預設世界） */
export const WORLD_BY_PROJECT: Record<string, Partial<WorldStyle>> = {
  care: { skyTop: '#9ccbe8', skyBottom: '#fdf3e4', fog: '#f1ede4', sparkle: '#ffffff', sun: '#ffe9c8' },
  admin: {
    skyTop: '#2a2018', skyBottom: '#6b5134', fog: '#4a3826', fogNear: 18, fogFar: 60, sparkle: '#ffe2a0', bloom: 0.6,
    ambient: '#ffe6c4', ambientI: 0.55, sun: '#ffe0b0', sunI: 2.2, hemi: ['#ffe6c4', '#3a2a1a'], env: ['#ffe6c4', '#9fd0ff'],
  },
  passport: {
    skyTop: '#4a9be6', skyBottom: '#ffe9d6', fog: '#e6eef8', fogNear: 30, fogFar: 110, sparkle: '#ffffff', bloom: 0.35,
  },
  tablet: {
    skyTop: '#06121f', skyBottom: '#123a4a', fog: '#0a2230', fogNear: 18, fogFar: 62, sparkle: '#9fe8ff', bloom: 1,
    ambient: '#9fd8e8', ambientI: 0.5, sun: '#e6f6ff', sunI: 1.6, hemi: ['#9fe8ff', '#0a1a24'], env: ['#9fe8ff', '#ffb070'],
  },
};

export function worldFor(kind: BuildingKind, projectId?: string): WorldStyle {
  return { ...WORLD[kind], ...(projectId ? WORLD_BY_PROJECT[projectId] : undefined) };
}

/** 柔和光暈：永遠位於主體正後方（相對鏡頭）的徑向漸層，讓視覺焦點鎖定在中央 */
const haloTexture = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function HaloLayer({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: haloTexture, color, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }), [color]);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m) return;
    dir.copy(camera.position).setY(0).normalize();
    m.position.set(-dir.x * 9, 0.6, -dir.z * 9);
    m.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-0.5} scale={22}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** 漸層天空穹頂（不受霧影響） */
export function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0); float k = smoothstep(0.35, 0.95, h); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }',
      }),
    [top, bottom],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[120, 32, 16]} />
    </mesh>
  );
}

/** 完整的世界：天空、霧、柔光、粒子、環境反射（地形與遠景由各作品的 3D 環境 env_*.glb 提供） */
export function World({ style, sparkles = true }: { style: WorldStyle; sparkles?: boolean }) {
  return (
    <>
      {/* 天空底部與霧同色：遠景沒入霧中時與地平線無縫銜接 */}
      <SkyDome top={style.skyTop} bottom={style.fog} />
      {/* 指數霧：近處主體清晰、遠景逐漸隱沒 */}
      <fogExp2 attach="fog" args={[style.fog, 1.45 / style.fogFar]} />
      <HaloLayer color={style.env[1]} />
      {sparkles && <Sparkles count={40} scale={[16, 9, 16]} position={[0, 2, 0]} size={3} speed={0.35} opacity={0.8} color={style.sparkle} />}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.4} color={style.env[0]} position={[0, 6, -8]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color={style.env[1]} position={[8, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="circle" intensity={1.2} color="#ffffff" position={[-6, 8, 4]} scale={3} />
      </Environment>
    </>
  );
}

/** 後製：只讓高亮的發光體（霓虹、燈籠、窗光）產生光暈，加上暗角 */
export function Effects({ bloom }: { bloom: number }) {
  return (
    // 效能：MSAA 4→2、Bloom 以半解析度、5 層 mip 計算
    <EffectComposer multisampling={2}>
      <Bloom mipmapBlur levels={5} resolutionScale={0.5} intensity={bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
      <Vignette darkness={0.55} offset={0.32} />
    </EffectComposer>
  );
}

/** 手機 / 觸控裝置關閉後製以確保流暢 */
export const allowEffects = () => typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches && window.innerWidth > 820;
