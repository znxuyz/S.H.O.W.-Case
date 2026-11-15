/**
 * 首頁島嶼的「選取法陣」：每種風格一套完全不同的造型。
 * 圖樣以 2D Canvas 即時繪製成貼圖（每種風格 × 強調色只畫一次並快取），
 * 疊在島嶼底下的平面上旋轉；部分風格另有立體附件（掃描環、跳動星芒、約束節點）。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThemeKey } from '../themes/types';

export type SigilKind = 'cyber' | 'ink' | 'rune' | 'forest' | 'campus' | 'engineer';

export const SIGIL_FOR_THEME: Record<ThemeKey, SigilKind> = {
  brand: 'campus', cyber: 'cyber', oriental: 'ink', mythic: 'rune', guardian: 'forest', campus: 'campus', blueprint: 'engineer',
};

const SIZE = 512;
const C = SIZE / 2;
type Ctx = CanvasRenderingContext2D;

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function ring(ctx: Ctx, r: number, w: number, color: string, dash?: number[]) {
  ctx.beginPath();
  ctx.setLineDash(dash ?? []);
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.arc(C, C, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}
function polar(r: number, a: number): [number, number] {
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
}

/* ───────── 各風格的圖樣（主層 main / 反轉層 alt） ───────── */
const DRAW: Record<SigilKind, { main: (ctx: Ctx, c: string) => void; alt: (ctx: Ctx, c: string) => void }> = {
  // 科技：賽博雷射刻度盤
  cyber: {
    main(ctx, c) {
      ring(ctx, 244, 4, c);
      ring(ctx, 230, 1.5, rgba(c, 0.6));
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const long = i % 15 === 0;
        const [x0, y0] = polar(long ? 196 : 212, a);
        const [x1, y1] = polar(228, a);
        ctx.strokeStyle = rgba(c, long ? 1 : 0.55);
        ctx.lineWidth = long ? 3 : 1.4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        if (long) {
          const [tx, ty] = polar(176, a);
          ctx.fillStyle = rgba(c, 0.85);
          ctx.font = '600 15px "JetBrains Mono", monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(i * 2).padStart(3, '0'), tx, ty);
        }
      }
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.lineWidth = 7; ctx.strokeStyle = rgba(c, 0.9);
        ctx.arc(C, C, 252, k * Math.PI / 2 + 0.2, k * Math.PI / 2 + 0.75); ctx.stroke();
      }
    },
    alt(ctx, c) {
      // 雷達掃描扇形 + 內圈虛線
      const g = ctx.createConicGradient(0, C, C);
      g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(0.12, rgba(c, 0)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, 160, 0, Math.PI * 2); ctx.fill();
      ring(ctx, 160, 2, rgba(c, 0.8), [6, 10]);
      ring(ctx, 120, 1.2, rgba(c, 0.5));
      for (let k = 0; k < 3; k++) { const [x, y] = polar(140, k * 2.1 + 0.4); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
    },
  },
  // 古典中式：窗櫺八角陣 + 水墨雲紋
  ink: {
    main(ctx, c) {
      ring(ctx, 246, 3, rgba(c, 0.9));
      ring(ctx, 236, 1, rgba(c, 0.6));
      // 八角窗櫺：兩個八邊形 + 回紋格
      for (const r of [200, 150]) {
        ctx.beginPath(); ctx.lineWidth = r === 200 ? 3 : 2; ctx.strokeStyle = rgba(c, 0.9);
        for (let k = 0; k <= 8; k++) { const [x, y] = polar(r, k * Math.PI / 4 + Math.PI / 8); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        const [x0, y0] = polar(150, a); const [x1, y1] = polar(200, a);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        // 回紋
        const [mx, my] = polar(175, a + Math.PI / 8);
        ctx.save(); ctx.translate(mx, my); ctx.rotate(a + Math.PI / 8);
        ctx.strokeRect(-9, -9, 18, 18); ctx.strokeRect(-4, -4, 8, 8);
        ctx.restore();
      }
    },
    alt(ctx, c) {
      // 外圈祥雲：一圈卷雲紋
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const [x, y] = polar(222, a);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let t = 0; t < 4.2; t += 0.1) { const r = 2 + t * 3.2; const px = Math.cos(t * 2.2) * r; const py = Math.sin(t * 2.2) * r * 0.7; if (t) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-26, 10); ctx.quadraticCurveTo(0, 18, 26, 10); ctx.stroke();
        ctx.restore();
      }
      ring(ctx, 120, 1.5, rgba(c, 0.5), [2, 8]);
    },
  },
  // 魔法 / 神獸：星象符文魔法陣
  rune: {
    main(ctx, c) {
      ring(ctx, 246, 3, c);
      ring(ctx, 214, 2, rgba(c, 0.8));
      const runes = '角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫';
      ctx.font = '700 22px "Noto Serif TC", serif'; ctx.fillStyle = rgba(c, 0.95); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [...runes].forEach((ch, i) => {
        const a = (i / runes.length) * Math.PI * 2;
        const [x, y] = polar(230, a);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
      });
      // 七芒星
      ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(c, 0.9);
      for (let k = 0; k <= 7; k++) { const [x, y] = polar(196, (k * 3 * Math.PI * 2) / 7 - Math.PI / 2); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      ring(ctx, 92, 2, rgba(c, 0.7));
    },
    alt(ctx, c) {
      // 星座連線
      const pts: [number, number][] = Array.from({ length: 9 }, (_, i) => polar(110 + (i % 3) * 22, i * 0.71 + 0.3));
      ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.2; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      pts.forEach(([x, y], i) => { ctx.fillStyle = i % 3 ? c : '#ffffff'; ctx.beginPath(); ctx.arc(x, y, i % 3 ? 3 : 5, 0, 7); ctx.fill(); });
      ring(ctx, 170, 1, rgba(c, 0.6), [14, 6, 2, 6]);
    },
  },
  // 森林：藤蔓葉環 + 螢光
  forest: {
    main(ctx, c) {
      ctx.strokeStyle = rgba('#9effc9', 0.8); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) { const r = 222 + Math.sin(t * 9) * 8; const [x, y] = polar(r, t); if (t) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        const [x, y] = polar(222 + Math.sin(a * 9) * 8, a);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + (k % 2 ? 0.9 : -0.9));
        ctx.fillStyle = k % 3 ? rgba('#5fd08a', 0.95) : rgba(c, 0.95);
        ctx.beginPath(); ctx.ellipse(14, 0, 16, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    alt(ctx, c) {
      for (let k = 0; k < 18; k++) {
        const [x, y] = polar(150 + (k % 4) * 18, k * 1.37);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, rgba(c, 0.9)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
      }
    },
  },
  // 校園：手繪虛線框（抖動筆觸）
  campus: {
    main(ctx, c) {
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = rgba(c, pass ? 0.55 : 1); ctx.lineWidth = pass ? 3 : 6;
        ctx.setLineDash(pass ? [] : [22, 16]);
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2.04; t += 0.03) {
          const r = 226 + Math.sin(t * 5 + pass * 2) * 5 + Math.sin(t * 13) * 2 + pass * 9;
          const [x, y] = polar(r, t + pass * 0.05);
          if (t) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    },
    alt(ctx, c) {
      // 小勾勾與愛心塗鴉
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 5;
      for (let k = 0; k < 4; k++) {
        const [x, y] = polar(178, k * Math.PI / 2 + 0.6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(k * Math.PI / 2 + 0.6 + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-3, 9); ctx.lineTo(14, -10); ctx.stroke();
        ctx.restore();
      }
    },
  },
  // 工程 / 演算法：方格角標 + 約束節點環
  engineer: {
    main(ctx, c) {
      ctx.strokeStyle = rgba(c, 0.95); ctx.lineWidth = 5;
      const s = 210, L = 64;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.beginPath(); ctx.moveTo(C + sx * s, C + sy * (s - L)); ctx.lineTo(C + sx * s, C + sy * s); ctx.lineTo(C + sx * (s - L), C + sy * s); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.strokeStyle = rgba('#cfe3ff', 0.35);
      for (let k = -4; k <= 4; k++) {
        ctx.beginPath(); ctx.moveTo(C + k * 40, C - 190); ctx.lineTo(C + k * 40, C + 190); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(C - 190, C + k * 40); ctx.lineTo(C + 190, C + k * 40); ctx.stroke();
      }
      ctx.font = '600 14px "JetBrains Mono", monospace'; ctx.fillStyle = rgba(c, 0.9);
      ctx.fillText('CP-SAT · OPTIMAL', C - 196, C - 222);
    },
    alt(ctx, c) {
      const n = 10;
      const pts = Array.from({ length: n }, (_, i) => polar(236, (i / n) * Math.PI * 2));
      ctx.strokeStyle = rgba('#9fd8ff', 0.7); ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) for (const j of [i + 3, i + 4]) {
        const [a, b] = [pts[i], pts[j % n]];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      pts.forEach(([x, y]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); });
    },
  },
};

const cache = new Map<string, THREE.Texture>();
function sigilTexture(kind: SigilKind, layer: 'main' | 'alt', color: string) {
  const key = `${kind}|${layer}|${color}`;
  let tex = cache.get(key);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    DRAW[kind][layer](ctx, color);
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    cache.set(key, tex);
  }
  return tex;
}

const planeGeo = new THREE.PlaneGeometry(1, 1);
const starGeo = new THREE.OctahedronGeometry(0.16, 0);
const nodeGeo = new THREE.SphereGeometry(0.09, 10, 8);

function layerMaterial(tex: THREE.Texture) {
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
}

/** 島嶼底下的選取法陣（visible 由外部控制，進場時有縮放淡入） */
export function Sigil({ kind, color, radius = 3.4 }: { kind: SigilKind; color: string; radius?: number }) {
  const main = useMemo(() => layerMaterial(sigilTexture(kind, 'main', color)), [kind, color]);
  const alt = useMemo(() => layerMaterial(sigilTexture(kind, 'alt', color)), [kind, color]);
  const extraMat = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color]);
  const root = useRef<THREE.Group>(null);
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Group>(null);
  const born = useRef(-1);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (born.current < 0) born.current = t;
    const k = Math.min(1, (t - born.current) / 0.35);
    const ease = 1 - Math.pow(1 - k, 3);
    if (root.current) root.current.scale.setScalar(0.6 + ease * 0.4);
    main.opacity = alt.opacity = ease;
    const speed = kind === 'cyber' ? 0.5 : kind === 'campus' ? 0.15 : 0.3;
    if (a.current) a.current.rotation.z += dt * speed;
    if (b.current) b.current.rotation.z -= dt * speed * (kind === 'cyber' ? 3 : 1.4);
    if (scan.current) { scan.current.position.y = 0.2 + ((t * 0.9) % 1) * 3.2; (scan.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ((t * 0.9) % 1)); }
    if (stars.current) stars.current.children.forEach((s, i) => { s.position.y = 0.4 + Math.abs(Math.sin(t * 3 + i * 1.3)) * 0.6; s.rotation.y += dt * 2; });
  });

  return (
    <group ref={root} position={[0, 0.06, 0]}>
      <mesh ref={a} geometry={planeGeo} material={main} rotation={[-Math.PI / 2, 0, 0]} scale={radius * 2} renderOrder={2} />
      <mesh ref={b} geometry={planeGeo} material={alt} rotation={[-Math.PI / 2, 0, 0]} scale={radius * 2} position={[0, 0.02, 0]} renderOrder={2} />
      {kind === 'cyber' && (
        <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.86, radius * 0.9, 64]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {kind === 'campus' && (
        <group ref={stars}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} geometry={starGeo} material={extraMat} position={[Math.cos(i * 1.57 + 0.8) * radius * 0.95, 0.5, Math.sin(i * 1.57 + 0.8) * radius * 0.95]} scale={[1, 1.6, 1]} />
          ))}
        </group>
      )}
      {kind === 'engineer' && [0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={nodeGeo} material={extraMat} position={[Math.cos(i * 1.57) * radius * 0.92, 0.15, Math.sin(i * 1.57) * radius * 0.92]} />
      ))}
    </group>
  );
}
