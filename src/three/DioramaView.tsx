/**
 * 介紹頁右側的 360° 微縮箱庭：透明畫布、柔和環境光 + 平行光陰影 + 點光源，
 * OrbitControls（阻尼、限制仰角不穿地、可縮放），無操作時緩慢自轉。
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PCFShadowMap } from 'three';
import { Diorama, LIGHTING } from './dioramas';
import type { BuildingKind } from './kinds';

export default function DioramaView({ kind, accent, reducedMotion }: { kind: BuildingKind; accent: string; reducedMotion: boolean }) {
  const L = LIGHTING[kind];
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [9.4, 7, 9.4], fov: 34, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight color={L.ambient} intensity={L.ambientI} />
      <hemisphereLight args={[L.hemi[0], L.hemi[1], 0.45]} />
      <directionalLight
        color={L.sun}
        intensity={L.sunI}
        position={[5, 9, 4]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={6}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={25}
      />
      <Suspense fallback={null}>
        <group position={[0, -0.6, 0]}>
          <Diorama kind={kind} accent={accent} lights />
        </group>
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 0.7, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={6}
        maxDistance={21}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.12}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.55}
      />
    </Canvas>
  );
}
