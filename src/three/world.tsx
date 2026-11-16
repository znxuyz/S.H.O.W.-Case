/**
 * 3D 世界環境：天空穹頂、延伸地面、遠景、漂浮粒子、程序化環境反射與後製。
 * 介紹頁的全螢幕舞台與首頁群島共用。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { mulberry32 } from '../lib/useCanvasLoop';
import { P, Tree } from './kit';
import type { BuildingKind } from './kinds';

export interface WorldStyle {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  sparkle: string;
  bloom: number;
  ambient: string;
  ambientI: number;
  sun: string;
  sunI: number;
  hemi: [string, string];
  /** 環境反射的主色（Lightformer） */
  env: [string, string];
  scenery: 'city' | 'rocks' | 'mountains' | 'forest' | 'hills' | 'blueprint' | 'constraints' | 'desk' | 'clouds' | 'library';
}

const CAMPUS: WorldStyle = {
  skyTop: '#7fb6ef', skyBottom: '#f6efe2', fog: '#dfe9ef', fogNear: 26, fogFar: 95, ground: '#9cc97a', sparkle: '#ffffff', bloom: 0.35,
  ambient: '#ffffff', ambientI: 0.7, sun: '#fff1d6', sunI: 2.6, hemi: ['#cfe6ff', '#8b6b4a'], env: ['#ffffff', '#ffe8c4'], scenery: 'hills',
};

export const WORLD: Record<BuildingKind, WorldStyle> = {
  tower: {
    skyTop: '#02040a', skyBottom: '#0b2a40', fog: '#04101c', fogNear: 18, fogFar: 58, ground: '#06121e', sparkle: '#22e4ff', bloom: 1.1,
    ambient: '#3a6a8a', ambientI: 0.45, sun: '#bfe9ff', sunI: 1.5, hemi: ['#22e4ff', '#0a141e'], env: ['#22e4ff', '#ff3df2'], scenery: 'city',
  },
  altar: {
    skyTop: '#090418', skyBottom: '#3a1648', fog: '#1d0d33', fogNear: 18, fogFar: 60, ground: '#1d0f33', sparkle: '#ffc76b', bloom: 1.1,
    ambient: '#6a4a9a', ambientI: 0.5, sun: '#ffe2b0', sunI: 1.5, hemi: ['#b98cff', '#1a0d2e'], env: ['#b98cff', '#ffc76b'], scenery: 'rocks',
  },
  pagoda: {
    skyTop: '#07070b', skyBottom: '#2e2a22', fog: '#17151a', fogNear: 16, fogFar: 54, ground: '#1b1d1a', sparkle: '#ffd98a', bloom: 0.95,
    ambient: '#6f7690', ambientI: 0.45, sun: '#c9d6ff', sunI: 1.3, hemi: ['#ffe9b0', '#24221d'], env: ['#c9d6ff', '#ff9a4d'], scenery: 'mountains',
  },
  treehouse: {
    skyTop: '#03141a', skyBottom: '#12524a', fog: '#0a2a26', fogNear: 16, fogFar: 52, ground: '#123b2c', sparkle: '#eaff9a', bloom: 1,
    ambient: '#5a8a7a', ambientI: 0.5, sun: '#d8fff0', sunI: 1.3, hemi: ['#9effc9', '#2a1d12'], env: ['#9effc9', '#ffcf6a'], scenery: 'forest',
  },
  school: CAMPUS, hall: CAMPUS, library: CAMPUS, kiosk: CAMPUS,
  // 國小排課系統：約束空間（約束網絡、時鐘刻度環、漂浮的課表面板）
  workshop: {
    skyTop: '#030a1c', skyBottom: '#0d2a52', fog: '#071a36', fogNear: 20, fogFar: 70, ground: '#081d3c', sparkle: '#9fd8ff', bloom: 1.0,
    ambient: '#8fb4e8', ambientI: 0.5, sun: '#e6f0ff', sunI: 1.8, hemi: ['#9fd8ff', '#0a2244'], env: ['#9fd8ff', '#ffc24a'], scenery: 'constraints',
  },
};

/** 依專案指定的世界（覆寫依造型決定的預設世界） */
export const WORLD_BY_PROJECT: Record<string, Partial<WorldStyle>> = {
  care: { skyTop: '#9ccbe8', skyBottom: '#fdf3e4', fog: '#f1ede4', ground: '#a8cf86', sparkle: '#ffffff', scenery: 'hills', sun: '#ffe9c8' },
  admin: {
    skyTop: '#2a2018', skyBottom: '#6b5134', fog: '#4a3826', fogNear: 18, fogFar: 60, ground: '#7a5634', sparkle: '#ffe2a0', bloom: 0.6,
    ambient: '#ffe6c4', ambientI: 0.55, sun: '#ffe0b0', sunI: 2.2, hemi: ['#ffe6c4', '#3a2a1a'], env: ['#ffe6c4', '#9fd0ff'], scenery: 'desk',
  },
  passport: {
    skyTop: '#4a9be6', skyBottom: '#ffe9d6', fog: '#e6eef8', fogNear: 30, fogFar: 110, ground: '#ffffff', sparkle: '#ffffff', bloom: 0.35, scenery: 'clouds',
  },
  tablet: {
    skyTop: '#06121f', skyBottom: '#123a4a', fog: '#0a2230', fogNear: 18, fogFar: 62, ground: '#0b2433', sparkle: '#9fe8ff', bloom: 1,
    ambient: '#9fd8e8', ambientI: 0.5, sun: '#e6f6ff', sunI: 1.6, hemi: ['#9fe8ff', '#0a1a24'], env: ['#9fe8ff', '#ffb070'], scenery: 'library',
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

/** 遠景：依主題環繞在舞台外圈 */
function Scenery({ kind }: { kind: WorldStyle['scenery'] }) {
  const items = useMemo(() => {
    const rnd = mulberry32(kind.length * 97 + 3);
    return Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2 + rnd() * 0.15;
      const r = 20 + rnd() * 14;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.6 + rnd() * 1.2, h: rnd(), i };
    });
  }, [kind]);
  const base = -4;
  switch (kind) {
    case 'city':
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x, base, t.z]}>
              <P c="#0a1d2c" p={[0, 2 + t.h * 5, 0]} s={[1.2 * t.s, 4 + t.h * 10, 1.2 * t.s]} m={0.7} ro={0.3} />
              <P c={t.i % 3 ? '#22e4ff' : '#ff3df2'} e ei={2} p={[0, 4 + t.h * 10, 0]} s={[1.25 * t.s, 0.08, 1.25 * t.s]} />
            </group>
          ))}
        </group>
      );
    case 'rocks':
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x, base + 3 + t.h * 10, t.z]}>
              <P g="dodeca" c="#3a2160" s={1.4 * t.s} />
              <P g="pyramid" c="#2b1748" p={[0, -1.4 * t.s, 0]} s={[1.6 * t.s, 2 * t.s, 1.6 * t.s]} r={[Math.PI, 0, 0]} />
              {t.i % 4 === 0 && <P g="oct" c="#b98cff" e ei={1.6} p={[0, 1 * t.s, 0]} s={0.5 * t.s} />}
            </group>
          ))}
          <P g="sphere" c="#ffd9a0" e ei={1.4} p={[-18, 16, -34]} s={8} />
        </group>
      );
    case 'mountains':
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x * 1.15, base, t.z * 1.15]}>
              <P g="cone" c={t.i % 2 ? '#2b2e2a' : '#353832'} p={[0, 3 + t.h * 3, 0]} s={[6 * t.s, 6 + t.h * 6, 6 * t.s]} ro={1} />
              {t.i % 5 === 0 && <Tree p={[1.8 * t.s, 0, 1.2]} kind="pine" s={1.4} c="#2f4a36" c2="#22382a" />}
            </group>
          ))}
          <P g="sphere" c="#ffe9b0" e ei={1.6} p={[16, 14, -30]} s={7} />
        </group>
      );
    case 'forest':
      return (
        <group>
          {items.map((t) => (
            <Tree key={t.i} p={[t.x * 0.85, base, t.z * 0.85]} s={2.6 + t.h * 2.4} kind={t.i % 3 ? 'pine' : 'round'} c="#1d6e52" c2="#0f4a3a" />
          ))}
          <P g="sphere" c="#e6fff0" e ei={1.4} p={[-14, 15, -30]} s={5} />
        </group>
      );
    case 'hills':
      return (
        <group>
          {items.slice(0, 16).map((t) => (
            <P key={t.i} g="ico1" c={t.i % 2 ? '#8fc06a' : '#a7d58c'} p={[t.x * 1.2, base - 2, t.z * 1.2]} s={[12 * t.s, 6 + t.h * 4, 12 * t.s]} ro={1} />
          ))}
          {items.slice(16).map((t) => (
            <group key={t.i} position={[t.x * 0.8, 9 + t.h * 6, t.z * 0.8]}>
              <P g="ico1" c="#ffffff" s={[2.6, 1.2, 1.6]} ro={1} />
              <P g="ico1" c="#ffffff" p={[1.2, 0.3, 0]} s={[1.6, 1.2, 1.2]} ro={1} />
              <P g="ico1" c="#f4f6fa" p={[-1.1, 0.2, 0.2]} s={[1.4, 1, 1.1]} ro={1} />
            </group>
          ))}
          {items.filter((t) => t.i % 3 === 0).map((t) => <Tree key={`t${t.i}`} p={[t.x * 0.62, base, t.z * 0.62]} s={2.2} />)}
        </group>
      );
    case 'constraints':
      return <Constraints />;
    case 'desk':
      // 辦公桌的微縮世界：遠方巨大的鉛筆、資料夾、文件堆與咖啡杯
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x * 1.45, base - 1, t.z * 1.45]} rotation={[0, t.h * 6, 0]}>
              {t.i % 4 === 0 && <P g="cyl6" c="#f2c230" p={[0, 0.5, 0]} s={[0.9, 10 * t.s, 0.9]} r={[Math.PI / 2, 0, 0]} />}
              {t.i % 4 === 1 && <P c={t.i % 8 === 1 ? '#4f86f7' : '#e45b5b'} p={[0, 0.3, 0]} s={[6 * t.s, 0.6, 4.4 * t.s]} />}
              {t.i % 4 === 2 && Array.from({ length: 5 }, (_, k) => <P key={k} c="#f4efe4" p={[(k % 2) * 0.2, 0.2 + k * 0.35, 0]} s={[4 * t.s, 0.3, 5 * t.s]} />)}
              {t.i % 4 === 3 && t.i % 3 === 0 && <P g="cyl" c="#ffffff" p={[0, 1.6, 0]} s={[3, 3.2, 3]} />}
            </group>
          ))}
        </group>
      );
    case 'clouds':
      // 雲海之上：大片雲朵、漂浮的小地球儀
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x * 1.3, base - 2.5 + (t.i % 3) * 1.2, t.z * 1.3]} scale={1.1 + t.s * 0.9}>
              <P g="ico1" c="#ffffff" s={[2.8, 1.2, 1.8]} ro={1} />
              <P g="ico1" c="#ffffff" p={[1.3, 0.35, 0]} s={[1.8, 1.3, 1.3]} ro={1} />
              <P g="ico1" c="#f2f5fa" p={[-1.2, 0.2, 0.3]} s={[1.6, 1.1, 1.2]} ro={1} />
            </group>
          ))}
          <P g="sphere" c="#ffe7b0" e ei={1.2} p={[18, 18, -32]} s={6} />
        </group>
      );
    case 'library':
      // 數位圖書館：環繞的發光書架，架上是文件卡
      return (
        <group>
          {items.map((t) => (
            <group key={t.i} position={[t.x * 1.6, base - 3, t.z * 1.6]} rotation={[0, Math.atan2(-t.x, -t.z), 0]}>
              <P c="#10283a" p={[0, 4, 0]} s={[3.2, 8, 0.6]} m={0.4} />
              {Array.from({ length: 4 }, (_, k) => (
                <group key={k}>
                  <P c="#5fd8ff" e ei={1.2} p={[0, 1.2 + k * 2, 0.32]} s={[3.1, 0.05, 0.05]} />
                  {Array.from({ length: 5 }, (_, j) => (
                    <P key={j} c={(j + k + t.i) % 3 === 0 ? '#e45b5b' : (j + k) % 2 ? '#4f86f7' : '#e8f4ff'} e ei={0.5} p={[-1.2 + j * 0.6, 1.8 + k * 2, 0.32]} s={[0.4, 1.0, 0.04]} />
                  ))}
                </group>
              ))}
            </group>
          ))}
          <gridHelper args={[140, 70, '#2f8fb8', '#123447']} position={[0, -3.99, 0]} />
        </group>
      );
    case 'blueprint':
      return (
        <group>
          <gridHelper args={[120, 60, '#5f8fd0', '#2a5c9e']} position={[0, base + 0.01, 0]} />
          {items.map((t) => (
            <P key={t.i} c="#cfe3ff" wire p={[t.x, base + (2 + t.h * 6) / 2, t.z]} s={[2 * t.s, 2 + t.h * 6, 2 * t.s]} />
          ))}
        </group>
      );
  }
}

/** 約束空間：節點與約束邊（單一 LineSegments，極省效能）、時鐘刻度環、漂浮課表面板 */
function Constraints() {
  const { nodes, edges } = useMemo(() => {
    const rnd = mulberry32(31);
    const nodes: THREE.Vector3[] = Array.from({ length: 46 }, () => {
      const a = rnd() * Math.PI * 2;
      const r = 15 + rnd() * 16;
      return new THREE.Vector3(Math.cos(a) * r, -2 + rnd() * 16, Math.sin(a) * r);
    });
    const pts: number[] = [];
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => ({ j, d: n.distanceTo(m) })).filter((x) => x.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
      near.forEach(({ j }) => pts.push(n.x, n.y, n.z, nodes[j].x, nodes[j].y, nodes[j].z));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return { nodes, edges: g };
  }, []);
  const panels = useMemo(() => {
    const rnd = mulberry32(77);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      return { p: [Math.cos(a) * 13, 2 + rnd() * 7, Math.sin(a) * 13] as [number, number, number], r: -a + Math.PI / 2, s: 0.8 + rnd() * 0.6 };
    });
  }, []);
  return (
    <group>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#5fb8ff" transparent opacity={0.35} />
      </lineSegments>
      {nodes.map((n, i) => (
        <P key={i} g="ico1" c={i % 5 ? '#7fd0ff' : '#ffc24a'} e ei={2} p={[n.x, n.y, n.z]} s={0.22 + (i % 3) * 0.08} />
      ))}
      <group position={[0, 6, -26]}>
        <P g="torus" c="#9fd8ff" e ei={0.9} s={22} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const long = i % 5 === 0;
          return <P key={i} c="#9fd8ff" e ei={long ? 1.4 : 0.6} p={[Math.sin(a) * 10.4, Math.cos(a) * 10.4, 0]} s={[0.08, long ? 0.9 : 0.4, 0.05]} r={[0, 0, -a]} />;
        })}
      </group>
      {panels.map((pl, i) => (
        <group key={i} position={pl.p} rotation={[0, pl.r, 0]} scale={pl.s}>
          <P c="#9fd8ff" op={0.12} s={[2.6, 2, 0.02]} />
          {Array.from({ length: 5 }, (_, d) => Array.from({ length: 4 }, (_, p) => (
            (d + p + i) % 3 !== 0 && <P key={`${d}${p}`} c={['#e45b5b', '#4f86f7', '#f29b30', '#36b37e', '#9b6ce0'][(d * 3 + p + i) % 5]} e ei={0.8} op={0.7} p={[-1 + d * 0.5, 0.7 - p * 0.45, 0.02]} s={[0.42, 0.36, 0.02]} />
          )))}
        </group>
      ))}
      <gridHelper args={[140, 70, '#2f6cb8', '#14335f']} position={[0, -3.99, 0]} />
    </group>
  );
}

/** 完整的世界：天空、霧、地面、遠景、粒子、環境反射 */
export function World({ style, sparkles = true, landscape = true }: { style: WorldStyle; sparkles?: boolean; landscape?: boolean }) {
  return (
    <>
      {/* 天空底部與霧同色：遠景沒入霧中時與地平線無縫銜接 */}
      <SkyDome top={style.skyTop} bottom={style.fog} />
      {/* 指數霧：近處主體清晰、遠景逐漸隱沒 */}
      <fogExp2 attach="fog" args={[style.fog, 1.45 / style.fogFar]} />
      <HaloLayer color={style.env[1]} />
      {landscape && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
            <circleGeometry args={[90, 48]} />
            <meshStandardMaterial color={style.ground} roughness={1} />
          </mesh>
          <Scenery kind={style.scenery} />
        </>
      )}
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
