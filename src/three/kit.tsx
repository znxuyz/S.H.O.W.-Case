/**
 * 程序化 Low-Poly 零件庫。
 * 所有幾何體與材質都只建立一次並全站共用（同色同參數的材質會被快取重複利用），
 * 每個物件只是「共用幾何 + 共用材質 + 位置/縮放/旋轉」，不需要任何外部模型檔。
 */
import * as THREE from 'three';

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  pyramid: new THREE.ConeGeometry(0.5, 1, 4),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  ico1: new THREE.IcosahedronGeometry(0.5, 1),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  dodeca: new THREE.DodecahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.03, 6, 48),
  ring: new THREE.TorusGeometry(0.5, 0.012, 4, 64),
};
export type Geo = keyof typeof GEO;

interface MatOpts {
  /** 發光：true = 用本色發光，或指定發光色 */
  e?: string | boolean;
  /** 發光強度 */
  ei?: number;
  /** 不透明度（< 1 即半透明） */
  op?: number;
  /** 金屬度 */
  m?: number;
  /** 粗糙度 */
  ro?: number;
  wire?: boolean;
}

const cache = new Map<string, THREE.Material>();
export function mat(color: string, o: MatOpts = {}) {
  const key = `${color}|${o.e ?? ''}|${o.ei ?? ''}|${o.op ?? ''}|${o.m ?? ''}|${o.ro ?? ''}|${o.wire ? 1 : 0}`;
  let m = cache.get(key);
  if (!m) {
    const emissive = o.e ? (o.e === true ? color : o.e) : '#000000';
    m = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: o.ro ?? 0.82,
      metalness: o.m ?? 0,
      emissive,
      emissiveIntensity: o.e ? (o.ei ?? 1.6) : 0,
      transparent: o.op !== undefined,
      opacity: o.op ?? 1,
      wireframe: o.wire ?? false,
      depthWrite: o.op === undefined,
    });
    cache.set(key, m);
  }
  return m;
}

type V3 = [number, number, number];

export interface PartProps extends MatOpts {
  g?: Geo;
  c: string;
  p?: V3;
  s?: number | V3;
  r?: V3;
  /** 是否投射陰影（發光體與半透明物預設不投射） */
  shadow?: boolean;
}

/** 一個零件：共用幾何 + 快取材質 */
export function P({ g = 'box', c, p, s, r, shadow, ...m }: PartProps) {
  const scale: V3 | undefined = typeof s === 'number' ? [s, s, s] : s;
  const cast = shadow ?? (!m.e && m.op === undefined && !m.wire);
  return <mesh geometry={GEO[g]} material={mat(c, m)} position={p} scale={scale} rotation={r} castShadow={cast} receiveShadow={!m.e} />;
}

/** 三角稜柱屋頂（沿 x 軸，屋脊朝上） */
export function Gable({ c, p, w, d, h }: { c: string; p: V3; w: number; d: number; h: number }) {
  return <P g="prism" c={c} p={p} s={[d * 1.16, w, h * 1.34]} r={[-Math.PI / 2, 0, Math.PI / 2]} />;
}

/** 四角攢尖屋頂（正方形對齊座標軸） */
export function Hip({ c, p, w, h, ...m }: { c: string; p: V3; w: number; h: number } & MatOpts) {
  return <P g="pyramid" c={c} p={p} s={[w * 1.414, h, w * 1.414]} r={[0, Math.PI / 4, 0]} {...m} />;
}

/** 方形地塊底座：石材收邊的頂層、土層、岩層，下方倒錐浮島岩底與碎石 */
export function Plinth({ top, soil, rock, rim = '#b9b2a2', size = 4, float = true }: { top: string; soil: string; rock: string; rim?: string; size?: number; float?: boolean }) {
  const h = size / 2;
  return (
    <group>
      <P c={top} p={[0, -0.14, 0]} s={[size - 0.16, 0.28, size - 0.16]} ro={0.95} />
      {/* 石材收邊 */}
      <P c={rim} p={[0, -0.13, h - 0.08]} s={[size, 0.3, 0.16]} ro={0.7} />
      <P c={rim} p={[0, -0.13, -h + 0.08]} s={[size, 0.3, 0.16]} ro={0.7} />
      <P c={rim} p={[h - 0.08, -0.13, 0]} s={[0.16, 0.3, size - 0.32]} ro={0.7} />
      <P c={rim} p={[-h + 0.08, -0.13, 0]} s={[0.16, 0.3, size - 0.32]} ro={0.7} />
      <P c={soil} p={[0, -0.52, 0]} s={[size - 0.06, 0.48, size - 0.06]} ro={1} />
      <P c={rock} p={[0, -0.96, 0]} s={[size - 0.18, 0.4, size - 0.18]} ro={1} />
      {float && (
        <>
          <P g="pyramid" c={rock} p={[0, -2.15, 0]} s={[size * 1.3, 2, size * 1.3]} r={[Math.PI, Math.PI / 4, 0]} ro={1} />
          <P g="dodeca" c={soil} p={[size * 0.32, -1.5, size * 0.18]} s={0.7} />
          <P g="dodeca" c={rock} p={[-size * 0.28, -1.8, -size * 0.2]} s={0.55} />
          <P g="dodeca" c={rock} p={[size * 0.1, -2.6, -size * 0.3]} s={0.35} />
        </>
      )}
    </group>
  );
}

/** 蓬鬆樹冠：多顆細分球體疊成，深淺綠交錯；或分層松樹 */
export function Tree({ p, s = 1, kind = 'round', c = '#4fbf73', c2 = '#2f8f5b' }: { p: V3; s?: number; kind?: 'round' | 'pine'; c?: string; c2?: string }) {
  return (
    <group position={p} scale={s}>
      <P g="cyl6" c="#6b4423" p={[0, 0.28, 0]} s={[0.12, 0.56, 0.12]} />
      {kind === 'round' ? (
        <>
          <P g="ico1" c={c2} p={[0, 0.82, 0]} s={0.62} />
          <P g="ico1" c={c} p={[-0.22, 0.95, 0.1]} s={0.46} />
          <P g="ico1" c={c} p={[0.22, 0.9, -0.12]} s={0.44} />
          <P g="ico1" c={c} p={[0.05, 1.18, 0.05]} s={0.4} />
          <P g="ico1" c={c2} p={[0.12, 0.7, 0.24]} s={0.34} />
          <P g="ico1" c="#8ee0a0" p={[-0.08, 1.28, -0.06]} s={0.2} />
        </>
      ) : (
        <>
          <P g="cone" c={c2} p={[0, 0.7, 0]} s={[0.78, 0.7, 0.78]} />
          <P g="cone" c={c} p={[0, 1.02, 0]} s={[0.6, 0.62, 0.6]} />
          <P g="cone" c={c2} p={[0, 1.32, 0]} s={[0.42, 0.52, 0.42]} />
          <P g="cone" c={c} p={[0, 1.58, 0]} s={[0.24, 0.42, 0.24]} />
        </>
      )}
    </group>
  );
}

/** 窗：外框 + 玻璃（可發光）+ 十字窗櫺。face 決定朝向（+z 或 +x） */
export function Win({ p, w = 0.24, h = 0.3, face = 'z', glow, frame = '#ffffff' }: { p: V3; w?: number; h?: number; face?: 'z' | 'x'; glow?: string; frame?: string }) {
  const rot: V3 = face === 'x' ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <group position={p} rotation={rot}>
      <P c={frame} s={[w + 0.06, h + 0.06, 0.03]} ro={0.6} />
      <P c={glow ?? '#7fa9d6'} p={[0, 0, 0.012]} s={[w, h, 0.02]} m={glow ? 0 : 0.6} ro={glow ? 0.6 : 0.15} e={glow ? glow : undefined} ei={glow ? 1.1 : undefined} />
      <P c={frame} p={[0, 0, 0.026]} s={[0.025, h, 0.01]} />
      <P c={frame} p={[0, 0, 0.026]} s={[w, 0.025, 0.01]} />
      <P c={frame} p={[0, -h / 2 - 0.04, 0.03]} s={[w + 0.1, 0.04, 0.06]} />
    </group>
  );
}

/** 路燈：燈桿、燈罩與發光燈泡 */
export function Lamp({ p, c = '#ffe6a6', pole = '#3a3f4a' }: { p: V3; c?: string; pole?: string }) {
  return (
    <group position={p}>
      <P g="cyl6" c={pole} p={[0, 0.45, 0]} s={[0.05, 0.9, 0.05]} m={0.7} ro={0.35} />
      <P g="cyl6" c={pole} p={[0, 0.02, 0]} s={[0.14, 0.04, 0.14]} m={0.7} ro={0.35} />
      <P g="sphere" c={c} e ei={2.4} p={[0, 0.96, 0]} s={0.14} />
      <P g="pyramid" c={pole} p={[0, 1.07, 0]} s={[0.24, 0.1, 0.24]} r={[0, Math.PI / 4, 0]} m={0.7} ro={0.35} />
    </group>
  );
}

/** 木柵欄 */
export function Fence({ p, len, rotY = 0, c = '#f4efe6' }: { p: V3; len: number; rotY?: number; c?: string }) {
  const n = Math.max(2, Math.round(len / 0.28));
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {Array.from({ length: n }, (_, i) => <P key={i} c={c} p={[-len / 2 + (len / (n - 1)) * i, 0.14, 0]} s={[0.04, 0.28, 0.04]} />)}
      <P c={c} p={[0, 0.2, 0]} s={[len, 0.03, 0.03]} />
      <P c={c} p={[0, 0.1, 0]} s={[len, 0.03, 0.03]} />
    </group>
  );
}

/** 長椅 */
export function Bench({ p, rotY = 0 }: { p: V3; rotY?: number }) {
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <P c="#a8743f" p={[0, 0.16, 0]} s={[0.5, 0.04, 0.16]} />
      <P c="#a8743f" p={[0, 0.27, -0.07]} s={[0.5, 0.12, 0.03]} />
      <P c="#3a3f4a" p={[-0.2, 0.08, 0]} s={[0.04, 0.16, 0.14]} m={0.6} />
      <P c="#3a3f4a" p={[0.2, 0.08, 0]} s={[0.04, 0.16, 0.14]} m={0.6} />
    </group>
  );
}

/** 人字屋頂瓦片：沿兩側斜面排列的瓦壟條 */
export function GableTiles({ p, w, d, h, c }: { p: V3; w: number; d: number; h: number; c: string }) {
  const slope = Math.atan2(h, d / 2);
  const len = Math.hypot(h, d / 2);
  const rows = Math.round(w / 0.16);
  return (
    <group position={p}>
      {[1, -1].map((side) => (
        <group key={side} position={[0, h / 2, (side * d) / 4]} rotation={[side * slope, 0, 0]}>
          {Array.from({ length: rows }, (_, i) => (
            <P key={i} g="cyl6" c={c} p={[-w / 2 + (w / rows) * (i + 0.5), 0.02, 0]} s={[0.05, len, 0.05]} r={[Math.PI / 2, 0, 0]} />
          ))}
        </group>
      ))}
    </group>
  );
}
