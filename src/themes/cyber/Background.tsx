import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BackgroundProps } from '../types';

const COLS = 140;
const ROWS = 70;
const SPACING = 0.42;

/** 資料地形：隨時間起伏的點陣曲面，高處轉為洋紅 */
function DataTerrain({ animate }: { animate: boolean }) {
  const points = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COLS * ROWS * 3);
    const colors = new Float32Array(COLS * ROWS * 3);
    let i = 0;
    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        positions[i * 3] = (x - COLS / 2) * SPACING;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = -z * SPACING;
        i++;
      }
    }
    return { positions, colors };
  }, []);

  const cyan = useMemo(() => new THREE.Color('#22e4ff'), []);
  const magenta = useMemo(() => new THREE.Color('#ff3df2'), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  const update = (t: number) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position.array as Float32Array;
    const col = geo.attributes.color.array as Float32Array;
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = pos[i * 3];
      const z = pos[i * 3 + 2] - t * 1.4;
      const y =
        Math.sin(x * 0.35 + t * 0.6) * 0.55 +
        Math.cos(z * 0.28) * 0.75 +
        Math.sin((x + z) * 0.12 + t * 0.3) * 1.1;
      pos[i * 3 + 1] = y;
      const k = THREE.MathUtils.clamp((y + 1.6) / 3.6, 0, 1);
      tmp.copy(cyan).lerp(magenta, k * k);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };

  const started = useRef(false);
  useFrame(({ clock }) => {
    if (!animate && started.current) return;
    started.current = true;
    update(animate ? clock.getElapsedTime() : 2);
  });

  return (
    <points ref={points} position={[0, -2.6, 4]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** 未來科技：WebGL 資料地形 + 掃描線 + HUD 準星 */
export default function CyberBackground({ active, reducedMotion }: BackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03060d]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(34,228,255,0.16),transparent_60%)]" />
      <Canvas
        className="!absolute inset-0"
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.2, 8], fov: 60 }}
        frameloop={active && !reducedMotion ? 'always' : 'demand'}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#03060d', 6, 26]} />
        <DataTerrain animate={active && !reducedMotion} />
      </Canvas>
      <div className="cyber-scanlines absolute inset-0" />
      <div className="cyber-sweep absolute inset-x-0 h-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.85)_100%)]" />
      <svg className="cyber-reticle absolute left-1/2 top-1/2 h-[min(80vh,80vw)] w-[min(80vh,80vw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" viewBox="0 0 200 200" fill="none" stroke="#22e4ff">
        <circle cx="100" cy="100" r="96" strokeWidth="0.3" strokeDasharray="1 3" />
        <circle cx="100" cy="100" r="70" strokeWidth="0.25" />
        <path d="M100 0v18M100 182v18M0 100h18M182 100h18" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
