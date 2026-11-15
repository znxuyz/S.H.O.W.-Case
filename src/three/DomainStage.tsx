/**
 * 介紹頁的全螢幕 3D 舞台：Canvas 佔滿整個視窗，箱庭不會被任何邊框裁切。
 * 透過 camera.setViewOffset 把箱庭推到畫面右側（直式則推到下方），
 * 左側留白給懸浮的文字排版。
 */
import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { PCFShadowMap, type PerspectiveCamera } from 'three';
import { Diorama } from './dioramas';
import type { BuildingKind } from './kinds';
import { allowEffects, Effects, World, WORLD } from './world';

/** 依視窗比例把主體推到右側 / 下方 */
function ViewShift() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const wide = size.width / size.height > 1.05 && size.width >= 1024;
    if (wide) cam.setViewOffset(size.width, size.height, -size.width * 0.2, 0, size.width, size.height);
    else cam.setViewOffset(size.width, size.height, 0, -size.height * 0.2, size.width, size.height);
    cam.updateProjectionMatrix();
    return () => { cam.clearViewOffset(); };
  }, [camera, size.width, size.height]);
  return null;
}

export default function DomainStage({ kind, accent, reducedMotion }: { kind: BuildingKind; accent: string; reducedMotion: boolean }) {
  const W = WORLD[kind];
  const fx = allowEffects();
  // 直式螢幕畫面窄，鏡頭拉遠讓整座箱庭入鏡
  const far = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 1 ? 1.75 : 1;
  return (
    <Canvas
      resize={{ offsetSize: true }}
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [10.5 * far, 6.5 * far, 10.5 * far], fov: 32, near: 0.1, far: 300 }}
      gl={{ antialias: !fx, powerPreference: 'high-performance' }}
    >
      <World style={W} />
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
        <Diorama kind={kind} accent={accent} lights />
      </group>
      <ContactShadows position={[0, -3.98, 0]} scale={18} blur={2.6} far={7} opacity={0.55} resolution={512} color="#000000" />
      <ViewShift />
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
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.5}
      />
      {fx && <Effects bloom={W.bloom} />}
    </Canvas>
  );
}
