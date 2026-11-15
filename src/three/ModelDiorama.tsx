/**
 * 外部 .glb 箱庭（Blender / AI 生成模型）。
 * - useGLTF 以 meshopt 解壓（解碼器內建在 JS 中，不需外部 CDN）
 * - 每次使用都 clone 一份場景（首頁群島與介紹頁可同時存在）
 * - 名為 Crane 的節點會緩慢旋轉、Hook 會上下擺動
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const modelUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export default function ModelDiorama({ url }: { url: string }) {
  const gltf = useGLTF(modelUrl(url), false, true);
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const glowing = mat.emissive && mat.emissive.getHex() !== 0;
      mesh.castShadow = !mat.transparent && !glowing;
      mesh.receiveShadow = !glowing;
      if (mat.transparent) mat.depthWrite = false;
    });
    return root;
  }, [gltf.scene]);

  const crane = useRef<THREE.Object3D | null>(null);
  const hook = useRef<THREE.Object3D | null>(null);
  const hookY = useRef(0);
  useMemo(() => {
    crane.current = scene.getObjectByName('Crane') ?? null;
    hook.current = scene.getObjectByName('Hook') ?? null;
    hookY.current = hook.current?.position.y ?? 0;
  }, [scene]);

  useFrame(({ clock }, dt) => {
    if (crane.current) crane.current.rotation.y += dt * 0.12;
    if (hook.current) hook.current.position.y = hookY.current + Math.sin(clock.elapsedTime * 0.9) * 0.12;
  });

  return <primitive object={scene} />;
}
