/**
 * 3D 世界環境：天空穹頂、指數霧、柔光層、漂浮粒子、程序化環境反射與後製。
 * 介紹頁的全螢幕舞台與首頁群島共用。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import type { BuildingKind } from './kinds';

export interface WorldStyle {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sparkle: string;
  ambient: string;
  ambientI: number;
  sun: string;
  sunI: number;
  hemi: [string, string];
  /** 環境反射的主色（Lightformer） */
  env: [string, string];
}

const CAMPUS: WorldStyle = {
  skyTop: '#7fb6ef', skyBottom: '#f6efe2', fog: '#dfe9ef', fogNear: 26, fogFar: 95, sparkle: '#ffffff',
  ambient: '#ffffff', ambientI: 0.7, sun: '#fff1d6', sunI: 2.6, hemi: ['#cfe6ff', '#8b6b4a'], env: ['#ffffff', '#ffe8c4'],
};

export const WORLD: Record<BuildingKind, WorldStyle> = {
  tower: {
    skyTop: '#02040a', skyBottom: '#0b2a40', fog: '#04101c', fogNear: 18, fogFar: 58, sparkle: '#22e4ff',
    ambient: '#3a6a8a', ambientI: 0.45, sun: '#bfe9ff', sunI: 1.5, hemi: ['#22e4ff', '#0a141e'], env: ['#22e4ff', '#ff3df2'],
  },
  altar: {
    skyTop: '#090418', skyBottom: '#3a1648', fog: '#1d0d33', fogNear: 18, fogFar: 60, sparkle: '#ffc76b',
    ambient: '#6a4a9a', ambientI: 0.5, sun: '#ffe2b0', sunI: 1.5, hemi: ['#b98cff', '#1a0d2e'], env: ['#b98cff', '#ffc76b'],
  },
  pagoda: {
    skyTop: '#07070b', skyBottom: '#2e2a22', fog: '#17151a', fogNear: 16, fogFar: 54, sparkle: '#ffd98a',
    ambient: '#6f7690', ambientI: 0.45, sun: '#c9d6ff', sunI: 1.3, hemi: ['#ffe9b0', '#24221d'], env: ['#c9d6ff', '#ff9a4d'],
  },
  treehouse: {
    skyTop: '#03141a', skyBottom: '#12524a', fog: '#0a2a26', fogNear: 16, fogFar: 52, sparkle: '#eaff9a',
    ambient: '#5a8a7a', ambientI: 0.5, sun: '#d8fff0', sunI: 1.3, hemi: ['#9effc9', '#2a1d12'], env: ['#9effc9', '#ffcf6a'],
  },
  school: CAMPUS, hall: CAMPUS, library: CAMPUS, kiosk: CAMPUS,
  // 國小排課系統：約束空間（約束網絡、時鐘刻度環、漂浮的課表面板）
  workshop: {
    skyTop: '#030a1c', skyBottom: '#0d2a52', fog: '#071a36', fogNear: 20, fogFar: 70, sparkle: '#9fd8ff',
    ambient: '#8fb4e8', ambientI: 0.5, sun: '#e6f0ff', sunI: 1.8, hemi: ['#9fd8ff', '#0a2244'], env: ['#9fd8ff', '#ffc24a'],
  },
};

/** 依專案指定的世界（覆寫依造型決定的預設世界） */
export const WORLD_BY_PROJECT: Record<string, Partial<WorldStyle>> = {
  care: { skyTop: '#9ccbe8', skyBottom: '#fdf3e4', fog: '#f1ede4', sparkle: '#ffffff', sun: '#ffe9c8' },
  admin: {
    skyTop: '#2a2018', skyBottom: '#6b5134', fog: '#4a3826', fogNear: 18, fogFar: 60, sparkle: '#ffe2a0',
    ambient: '#ffe6c4', ambientI: 0.55, sun: '#ffe0b0', sunI: 2.2, hemi: ['#ffe6c4', '#3a2a1a'], env: ['#ffe6c4', '#9fd0ff'],
  },
  passport: {
    skyTop: '#4a9be6', skyBottom: '#ffe9d6', fog: '#e6eef8', fogNear: 30, fogFar: 110, sparkle: '#ffffff',
  },
  tablet: {
    skyTop: '#06121f', skyBottom: '#123a4a', fog: '#0a2230', fogNear: 18, fogFar: 62, sparkle: '#9fe8ff',
    ambient: '#9fd8e8', ambientI: 0.5, sun: '#e6f6ff', sunI: 1.6, hemi: ['#9fe8ff', '#0a1a24'], env: ['#9fe8ff', '#ffb070'],
  },
};

export function worldFor(kind: BuildingKind, projectId?: string): WorldStyle {
  return { ...WORLD[kind], ...(projectId ? WORLD_BY_PROJECT[projectId] : undefined) };
}

/**
 * 柔和光暈：永遠位於主體正後方（相對鏡頭）的徑向漸層，讓視覺焦點鎖定在中央。
 * 用著色器即時計算平滑漸層，不用 Canvas 2D 漸層貼圖——iOS Safari 畫 Canvas 漸層時會加入逐像素的彩色抖動
 * （dithering），貼圖放大後在手機上變成一圈五顏六色的雜點。
 */
const HALO_VERT = /* glsl */ `precision highp float;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FRAG = /* glsl */ `precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
  // 與原本的漸層一致：中心 0.9 → 0.35 處 0.35 → 邊緣 0，再用 smoothstep 讓邊緣更柔
  float a = d < 0.35 ? mix(0.9, 0.35, d / 0.35) : mix(0.35, 0.0, smoothstep(0.0, 1.0, (d - 0.35) / 0.65));
  gl_FragColor = vec4(uColor, a * uOpacity);
  #include <colorspace_fragment>
}`;

function HaloLayer({ color, opacity = 0.42 }: { color: string; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
  }), [color, opacity]);
  useEffect(() => () => mat.dispose(), [mat]);
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
        vertexShader: 'precision highp float; varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'precision highp float; uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0); float k = smoothstep(0.35, 0.95, h); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }',
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
  // 淺色天空（校園、行政等）時柔光減弱，避免把左上角文字底下洗白；手機再減一些並關閉漂浮粒子
  const light = new THREE.Color(style.fog).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
  const touch = isTouch();
  const haloOpacity = (light ? 0.16 : 0.42) * (touch ? 0.7 : 1);
  const showSparkles = sparkles && !touch;
  return (
    <>
      {/* 天空底部與霧同色：遠景沒入霧中時與地平線無縫銜接 */}
      <SkyDome top={style.skyTop} bottom={style.fog} />
      {/* 指數霧：近處主體清晰、遠景逐漸隱沒 */}
      <fogExp2 attach="fog" args={[style.fog, 1.45 / style.fogFar]} />
      <HaloLayer color={style.env[1]} opacity={haloOpacity} />
      {showSparkles && <Sparkles count={40} scale={[16, 9, 16]} position={[0, 2, 0]} size={3} speed={0.35} opacity={0.8} color={style.sparkle} />}
      <Environment resolution={64} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.4} color={style.env[0]} position={[0, 6, -8]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color={style.env[1]} position={[8, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="circle" intensity={1.2} color="#ffffff" position={[-6, 8, 4]} scale={3} />
      </Environment>
    </>
  );
}

/**
 * WebGL 設定：一律 highp（手機預設的 mediump 會讓雜訊／法線運算溢位成彩色雜點）＋抗鋸齒
 * （dpr 已上限 1.5，手機的 tile-based GPU 做 MSAA 成本很低）。
 */
export const GL_OPTS = { antialias: true, precision: 'highp' as const, powerPreference: 'high-performance' as const };
/** 觸控裝置（手機、平板） */
export const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
export const allowEffects = () => typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches && window.innerWidth > 820;
