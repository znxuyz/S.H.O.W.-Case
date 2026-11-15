/**
 * 等距（Isometric）繪圖工具：世界座標 (x, y, z) → SVG 平面座標。
 * x 軸往右下、y 軸往左下、z 軸往上。與沙盤 rotateX(55deg) rotateZ(45deg) 的視角一致。
 */
import type { ReactNode, SVGProps } from 'react';

const COS = 0.8660254;
const SIN = 0.5;

export type V3 = [number, number, number];

export function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS, (x + y) * SIN - z];
}

export function pts(list: V3[]) {
  return list.map(([x, y, z]) => iso(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');
}

export function at(x: number, y: number, z: number) {
  const [px, py] = iso(x, y, z);
  return { x: px, y: py };
}

/** 色彩混合：t>0 往白、t<0 往黑 */
export function tone(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const target = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  const out = ch.map((c) => Math.round(c + (target - c) * k));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

type Faces = { top?: string; left?: string; right?: string };

/** 立方體：受光頂面（亮）、左側面（中）、右側背光面（暗） */
export function Box({
  x, y, z, w, d, h, color, faces, stroke, strokeWidth = 0.6, opacity, children,
}: {
  x: number; y: number; z: number; w: number; d: number; h: number;
  color: string; faces?: Faces; stroke?: string; strokeWidth?: number; opacity?: number; children?: ReactNode;
}) {
  const top = faces?.top ?? tone(color, 0.22);
  const left = faces?.left ?? color;
  const right = faces?.right ?? tone(color, -0.32);
  const common: SVGProps<SVGPolygonElement> = { stroke, strokeWidth, strokeLinejoin: 'round' };
  return (
    <g opacity={opacity}>
      <polygon {...common} fill={left} points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} />
      <polygon {...common} fill={right} points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} />
      <polygon {...common} fill={top} points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} />
      {children}
    </g>
  );
}

/** 四角攢尖屋頂（可選飛簷翹角） */
export function HipRoof({
  s, z, h, color, edge, ridge = 0.25, flare = 0,
}: { s: number; z: number; h: number; color: string; edge?: string; ridge?: number; flare?: number }) {
  const r = s * ridge;
  const left = pts([[-s, s, z], [s, s, z], [r, r, z + h], [-r, r, z + h]]);
  const right = pts([[s, -s, z], [s, s, z], [r, r, z + h], [r, -r, z + h]]);
  const back = pts([[-s, -s, z], [-s, s, z], [-r, r, z + h], [-r, -r, z + h]]);
  const top = pts([[-r, -r, z + h], [r, -r, z + h], [r, r, z + h], [-r, r, z + h]]);
  const curl = (cx: number, cy: number) => {
    const a = at(cx, cy, z);
    const b = at(cx * (1 + flare / s), cy * (1 + flare / s), z + flare * 1.3);
    return <path d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${a.y + 2} ${b.x},${b.y}`} stroke={edge ?? color} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  };
  return (
    <g>
      <polygon fill={tone(color, -0.15)} points={back} />
      <polygon fill={color} points={left} />
      <polygon fill={tone(color, -0.35)} points={right} />
      <polygon fill={tone(color, 0.2)} points={top} />
      {edge && <polyline fill="none" stroke={edge} strokeWidth={1.2} points={pts([[-s, s, z], [s, s, z], [s, -s, z]])} />}
      {flare > 0 && (
        <>
          {curl(s, s)}
          {curl(-s, s)}
          {curl(s, -s)}
        </>
      )}
    </g>
  );
}

/** 沿 x 軸的人字屋頂 */
export function GableRoof({ x0, x1, d, z, h, color, wall }: { x0: number; x1: number; d: number; z: number; h: number; color: string; wall: string }) {
  return (
    <g>
      <polygon fill={tone(color, -0.2)} points={pts([[x0, -d, z], [x1, -d, z], [x1, 0, z + h], [x0, 0, z + h]])} />
      <polygon fill={tone(wall, -0.3)} points={pts([[x1, -d, z], [x1, d, z], [x1, 0, z + h]])} />
      <polygon fill={color} points={pts([[x0, d, z], [x1, d, z], [x1, 0, z + h], [x0, 0, z + h]])} />
      <polyline fill="none" stroke={tone(color, 0.35)} strokeWidth={1} points={pts([[x0, 0, z + h], [x1, 0, z + h]])} />
    </g>
  );
}

/** 水平圓（等距橢圓）的前半或後半弧 */
export function RingArc({ r, z, half, ...rest }: { r: number; z: number; half: 'back' | 'front' } & SVGProps<SVGPathElement>) {
  const c = at(0, 0, z);
  const rx = r * 1.2247;
  const ry = r * 0.7071;
  const d = half === 'back'
    ? `M${c.x - rx},${c.y} A${rx},${ry} 0 0 1 ${c.x + rx},${c.y}`
    : `M${c.x - rx},${c.y} A${rx},${ry} 0 0 0 ${c.x + rx},${c.y}`;
  return <path d={d} fill="none" {...rest} />;
}

/** 正面牆上的窗格（y = d 的左側面），自動排列 */
export function FaceWindows({
  face, x0, x1, y0, y1, fixed, z0, z1, cols, rows, color, pad = 0.18,
}: {
  face: 'left' | 'right'; x0?: number; x1?: number; y0?: number; y1?: number; fixed: number;
  z0: number; z1: number; cols: number; rows: number; color: string; pad?: number;
}) {
  const out: ReactNode[] = [];
  const a0 = face === 'left' ? x0! : y0!;
  const a1 = face === 'left' ? x1! : y1!;
  const cw = (a1 - a0) / cols;
  const rh = (z1 - z0) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u0 = a0 + cw * (i + pad);
      const u1 = a0 + cw * (i + 1 - pad);
      const v0 = z0 + rh * (j + pad);
      const v1 = z0 + rh * (j + 1 - pad);
      const P = (u: number, v: number): V3 => (face === 'left' ? [u, fixed, v] : [fixed, u, v]);
      out.push(<polygon key={`${i}-${j}`} fill={color} points={pts([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)])} />);
    }
  }
  return <g>{out}</g>;
}
