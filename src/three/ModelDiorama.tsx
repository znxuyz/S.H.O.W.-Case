/**
 * 外部 .glb 箱庭（Blender 程序化建模 / AI 生成模型）。
 * - useGLTF 以 meshopt 解壓（解碼器內建在 JS 中，不需外部 CDN）
 * - 每次使用都 clone 一份場景（首頁群島與介紹頁可同時存在）
 * - 依「節點名稱」驅動動畫，建模腳本只要命名就能動：
 *     Gear*        繞自身軸旋轉        ClockHand / ClockHandH  時鐘分針 / 時針
 *     GantryBridge 沿深度方向來回      GantryHead              沿左右方向來回
 *     Drop_N       依序升起、落回格子  Spin* / Bob*            通用旋轉 / 上下浮動
 *     Billboard*   永遠面向鏡頭        Lit_N                   依序點亮（N 由 0 起）
 *     SpinR*       反向旋轉            Pulse*                  呼吸縮放
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const modelUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

interface Rig { node: THREE.Object3D; base: THREE.Vector3; kind: string; index: number }

export default function ModelDiorama({ url }: { url: string }) {
  const gltf = useGLTF(modelUrl(url), false, true);
  const { scene, rigs } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const rigs: Rig[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const glowing = mat.emissive && mat.emissive.getHex() !== 0;
        // 角色插畫看板（card_*）：以 alphaTest 裁切透明背景，清晰且不需排序
        const card = mat.name.startsWith('card_');
        if (card) {
          mat.transparent = false;
          mat.alphaTest = 0.5;
          mat.depthWrite = true;
          mat.side = THREE.DoubleSide;
        }
        mesh.castShadow = !mat.transparent && !glowing && !card;
        mesh.receiveShadow = !glowing && !card;
        if (mat.transparent) mat.depthWrite = false;
      }
      const m = /^(Gear|ClockHandH|ClockHand|GantryBridge|GantryHead|Drop_|SpinR|Spin|Bob|Crane|Hook|Billboard|Lit_|Pulse)(\d*)/.exec(o.name);
      if (m) rigs.push({ node: o, base: o.position.clone(), kind: m[1], index: Number(m[2] || 0) });
    });
    return { scene: root, rigs };
  }, [gltf.scene]);

  const litCount = useMemo(() => rigs.filter((r) => r.kind === 'Lit_').length, [rigs]);
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    for (const r of rigs) {
      const n = r.node;
      switch (r.kind) {
        case 'Gear': n.rotation.z += dt * (r.node.name.endsWith('B') ? -1.6 : 1) * 0.9; break;
        case 'ClockHand': n.rotation.z -= dt * 0.8; break;
        case 'ClockHandH': n.rotation.z -= dt * 0.07; break;
        case 'GantryBridge': n.position.z = r.base.z + Math.sin(t * 0.45) * 1.1; break;
        case 'GantryHead': n.position.x = r.base.x + Math.sin(t * 0.7 + 1) * 1.15; break;
        case 'Drop_': {
          // 每塊積木輪流：懸空 → 落入格子 → 停留 → 再被提起（求解中）
          const phase = ((t * 0.35 + r.index * 0.25) % 1 + 1) % 1;
          const k = phase < 0.45 ? 1 : phase < 0.6 ? 1 - (phase - 0.45) / 0.15 : phase < 0.9 ? 0 : (phase - 0.9) / 0.1;
          const ease = k * k * (3 - 2 * k);
          n.position.y = r.base.y - 0.54 * (1 - ease) + Math.sin(t * 2 + r.index) * 0.03 * ease;
          break;
        }
        case 'Spin': case 'Crane': n.rotation.y += dt * (0.12 + (r.index % 3) * 0.1); break;
        case 'SpinR': n.rotation.y -= dt * (0.18 + (r.index % 3) * 0.08); break;
        case 'Bob': case 'Hook': n.position.y = r.base.y + Math.sin(t * 0.9 + r.index * 1.3) * 0.1; break;
        case 'Pulse': n.scale.setScalar(1 + Math.sin(t * 1.6 + r.index) * 0.06); break;
        case 'Billboard': {
          // 只繞垂直軸轉向鏡頭（保持直立）
          n.parent?.updateWorldMatrix(true, false);
          const wp = n.getWorldPosition(tmpV);
          const yaw = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
          const parentYaw = n.parent ? new THREE.Euler().setFromQuaternion(n.parent.getWorldQuaternion(tmpQ), 'YXZ').y : 0;
          n.rotation.set(0, yaw - parentYaw, 0);
          break;
        }
        case 'Lit_': {
          // 依序點亮，全亮後重來（例如：被借用的教室、15 天的觀察期）
          const step = Math.floor(t * 1.4) % (litCount + 3);
          n.visible = r.index < step;
          break;
        }
      }
    }
  });

  return <primitive object={scene} />;
}
