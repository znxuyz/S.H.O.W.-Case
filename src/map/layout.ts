/**
 * 浮空大地圖佈局。沙盤平面座標為 1000 × 1000，兩座浮島：
 *   personal 個人創作島、campus 校園專案島，中間以橋樑相連。
 * 作品依 category 自動分配到島上的建築位（slot），新增作品不需要手填座標。
 */
import type { Project } from '../data/projects';
import type { ThemeKey } from '../themes/types';
import type { BuildingKind, PropKind } from './buildings';
import { mulberry32 } from '../lib/useCanvasLoop';

export const PLANE = 1000;

export interface Island {
  key: Project['category'];
  label: string;
  en: string;
  cx: number;
  cy: number;
  r: number;
  seed: number;
  /** 建築位，相對島心 */
  slots: [number, number][];
}

const ISLANDS: Island[] = [
  {
    key: 'personal', label: '個人創作', en: 'PERSONAL WORKS', cx: 300, cy: 700, r: 228, seed: 11,
    slots: [[-118, -78], [92, -118], [118, 88], [-88, 120], [-6, 0], [-175, 30], [30, -185]],
  },
  {
    key: 'campus', label: '校園專案', en: 'CAMPUS TOOLS', cx: 700, cy: 300, r: 226, seed: 29,
    slots: [[-128, -60], [-20, -150], [110, -100], [150, 40], [60, 145], [-80, 120], [0, 0], [-170, 50]],
  },
];

/** 直式螢幕把兩島改成上下排列：沿對角線鏡射 y */
export function islandsFor(portrait: boolean): Island[] {
  if (!portrait) return ISLANDS;
  return ISLANDS.map((i) => ({ ...i, cy: PLANE - i.cy, slots: i.slots.map(([x, y]) => [x, -y] as [number, number]) }));
}

/** 不規則島嶼輪廓（相對島心的多邊形頂點） */
export function islandOutline(r: number, seed: number, jitter = 1) {
  const rnd = mulberry32(seed);
  const a = rnd() * 6, b = rnd() * 6, c = rnd() * 6;
  const out: [number, number][] = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * t + a) + 0.05 * Math.sin(5 * t + b) + 0.03 * Math.sin(9 * t + c) + (rnd() - 0.5) * 0.04 * jitter;
    out.push([Math.cos(t) * r * k, Math.sin(t) * r * k]);
  }
  return out;
}

export const DEFAULT_BUILDING: Record<ThemeKey, BuildingKind> = {
  brand: 'hall',
  cyber: 'tower',
  mythic: 'altar',
  oriental: 'pagoda',
  guardian: 'treehouse',
  campus: 'school',
  blueprint: 'workshop',
};

const GROUND: Partial<Record<ThemeKey, { fill: string; stroke: string }>> = {
  cyber: { fill: '#0b1a28', stroke: '#22e4ff' },
  mythic: { fill: '#2b1745', stroke: '#b98cff' },
  oriental: { fill: '#1d1813', stroke: '#e8c872' },
  guardian: { fill: '#2f7a4c', stroke: '#9effc9' },
  blueprint: { fill: '#123c72', stroke: '#cfe3ff' },
};

const PROPS: Partial<Record<ThemeKey, PropKind[]>> = {
  cyber: ['spire', 'spire', 'spire'],
  mythic: ['crystal', 'crystal', 'rock'],
  oriental: ['lantern', 'pine', 'lantern'],
  guardian: ['tree', 'tree', 'bush'],
  campus: ['tree', 'lamp', 'bush'],
  blueprint: ['lamp', 'rock'],
};

export interface Placed {
  project: Project;
  island: Island;
  x: number;
  y: number;
  kind: BuildingKind;
  accent: string;
  ground?: { fill: string; stroke: string };
  order: number;
}

const ACCENT: Record<ThemeKey, string> = {
  brand: '#c8a869', cyber: '#22e4ff', mythic: '#ffc76b', oriental: '#e8c872', guardian: '#ffd35a', campus: '#3563e9', blueprint: '#ffd166',
};

export function placeProjects(projects: Project[], islands: Island[]): Placed[] {
  const used = new Map<string, number>();
  return projects.map((p, order) => {
    const island = islands.find((i) => i.key === p.category) ?? islands[0];
    const n = used.get(island.key) ?? 0;
    used.set(island.key, n + 1);
    // 超出預設建築位時，沿外圈繼續排列
    const [dx, dy] = island.slots[n] ?? [Math.cos(n * 2.4) * island.r * 0.62, Math.sin(n * 2.4) * island.r * 0.62];
    return {
      project: p, island, order,
      x: island.cx + dx, y: island.cy + dy,
      kind: p.building ?? DEFAULT_BUILDING[p.theme],
      accent: p.accent ?? ACCENT[p.theme],
      ground: GROUND[p.theme],
    };
  });
}

export interface PropSpot { x: number; y: number; kind: PropKind; key: string }

/** 每座建築周圍散佈 3 個風格小物 + 島緣植栽 */
export function scatterProps(placed: Placed[], islands: Island[]): PropSpot[] {
  const out: PropSpot[] = [];
  placed.forEach((b) => {
    const kinds = PROPS[b.project.theme] ?? PROPS.campus!;
    const rnd = mulberry32(b.order * 97 + 5);
    kinds.forEach((kind, i) => {
      const ang = rnd() * Math.PI * 2;
      const rad = 62 + rnd() * 16;
      out.push({ x: b.x + Math.cos(ang + i * 2.1) * rad, y: b.y + Math.sin(ang + i * 2.1) * rad, kind, key: `${b.project.id}-${i}` });
    });
  });
  islands.forEach((isl) => {
    const rnd = mulberry32(isl.seed * 13);
    for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2 + rnd() * 0.3;
      const rad = isl.r * (0.8 + rnd() * 0.06);
      const kind: PropKind = isl.key === 'personal' ? (i % 3 ? 'pine' : 'rock') : i % 2 ? 'tree' : 'bush';
      out.push({ x: isl.cx + Math.cos(t) * rad, y: isl.cy + Math.sin(t) * rad, kind, key: `${isl.key}-edge-${i}` });
    }
  });
  // 遠離建築中心，避免小物擋住建築
  return out.filter((p) => placed.every((b) => Math.hypot(b.x - p.x, b.y - p.y) > 48));
}

/** 能量軌道：島心 → 各建築的弧線，以及跨島主幹 */
export function trackPaths(placed: Placed[], islands: Island[]) {
  const paths: { d: string; key: string; main?: boolean }[] = [];
  placed.forEach((b) => {
    const { cx, cy } = b.island;
    const mx = (cx + b.x) / 2, my = (cy + b.y) / 2;
    const nx = -(b.y - cy) * 0.22, ny = (b.x - cx) * 0.22;
    paths.push({ key: b.project.id, d: `M${cx},${cy} Q${mx + nx},${my + ny} ${b.x},${b.y}` });
  });
  const [a, c] = islands;
  if (a && c) paths.push({ key: 'bridge', main: true, d: `M${a.cx},${a.cy} L${c.cx},${c.cy}` });
  return paths;
}

export function bridgeGeometry(islands: Island[]) {
  const [a, c] = islands;
  const dx = c.cx - a.cx, dy = c.cy - a.cy;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const start = { x: a.cx + ux * a.r * 0.78, y: a.cy + uy * a.r * 0.78 };
  const end = { x: c.cx - ux * c.r * 0.78, y: c.cy - uy * c.r * 0.78 };
  return { x: start.x, y: start.y, length: Math.hypot(end.x - start.x, end.y - start.y), angle: (Math.atan2(uy, ux) * 180) / Math.PI };
}
