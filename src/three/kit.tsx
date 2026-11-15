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

/** 方形地塊底座：草皮/鋪面頂層、土層、岩層，下方倒錐浮島岩底 */
export function Plinth({ top, soil, rock, size = 4, float = true }: { top: string; soil: string; rock: string; size?: number; float?: boolean }) {
  return (
    <group>
      <P c={top} p={[0, -0.14, 0]} s={[size, 0.28, size]} />
      <P c={soil} p={[0, -0.52, 0]} s={[size - 0.06, 0.48, size - 0.06]} />
      <P c={rock} p={[0, -0.96, 0]} s={[size - 0.18, 0.4, size - 0.18]} />
      {float && (
        <>
          <P g="pyramid" c={rock} p={[0, -2.15, 0]} s={[size * 1.3, 2, size * 1.3]} r={[Math.PI, Math.PI / 4, 0]} />
          <P g="dodeca" c={soil} p={[size * 0.32, -1.5, size * 0.18]} s={0.7} />
          <P g="dodeca" c={rock} p={[-size * 0.28, -1.8, -size * 0.2]} s={0.55} />
        </>
      )}
    </group>
  );
}

/** 低多邊形樹（圓冠或松樹） */
export function Tree({ p, s = 1, kind = 'round', c = '#3fae6a', c2 = '#2f8f5b' }: { p: V3; s?: number; kind?: 'round' | 'pine'; c?: string; c2?: string }) {
  return (
    <group position={p} scale={s}>
      <P g="cyl6" c="#6b4423" p={[0, 0.25, 0]} s={[0.12, 0.5, 0.12]} />
      {kind === 'round' ? (
        <>
          <P g="ico" c={c} p={[0, 0.78, 0]} s={0.75} />
          <P g="ico" c={c2} p={[0.18, 0.62, 0.12]} s={0.45} />
        </>
      ) : (
        <>
          <P g="cone" c={c2} p={[0, 0.7, 0]} s={[0.75, 0.7, 0.75]} />
          <P g="cone" c={c} p={[0, 1.05, 0]} s={[0.56, 0.6, 0.56]} />
          <P g="cone" c={c2} p={[0, 1.35, 0]} s={[0.36, 0.5, 0.36]} />
        </>
      )}
    </group>
  );
}
