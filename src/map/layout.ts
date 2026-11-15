/**
 * 浮空群島佈局：每一件作品都是一座獨立的微型浮空島。
 *
 * 位置以「螢幕座標」設計（X 往右、Y 往下，單位 px，縮放 1 時），
 * 再換算回沙盤平面座標，讓群島在等距視角下排成錯落的星座。
 * 新增作品時會自動接續排列，不需要手填座標。
 */
import type { Project } from '../data/projects';
import type { ThemeKey } from '../themes/types';
import type { BuildingKind, PropKind } from './buildings';
import { mulberry32 } from '../lib/useCanvasLoop';

/** 沙盤視角：rotateX(BOARD_RX) rotateZ(BOARD_RZ) */
export const BOARD_RX = 55;
export const BOARD_RZ = 45;
const COS_RX = Math.cos((BOARD_RX * Math.PI) / 180);

/** 螢幕座標 → 沙盤平面座標（以沙盤中心為原點） */
function toPlane(X: number, Y: number) {
  const a = Math.SQRT2 * X;
  const b = (Math.SQRT2 * Y) / COS_RX;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** 橫式：上排 4 座（較大），下排 6 座，交錯起伏（座標為設計值，實際會被透視壓縮） */
const LANDSCAPE: [number, number][] = [
  [-400, -250], [-135, -290], [135, -240], [400, -280],
  // 下排由右往左，讓能量橋樑蛇行串連、不會斜切過畫面
  [530, 150], [318, 185], [106, 145], [-106, 185], [-318, 148], [-530, 182],
];
/** 直式：兩欄交錯 */
const PORTRAIT: [number, number][] = Array.from({ length: 10 }, (_, i) => [i % 2 ? 118 : -118, -360 + i * 84 + (i % 2 ? 26 : 0)] as [number, number]);

function slotFor(i: number, portrait: boolean): [number, number] {
  const list = portrait ? PORTRAIT : LANDSCAPE;
  if (list[i]) return list[i];
  // 超出預設位置：往下再開一排
  const extra = i - list.length;
  return portrait
    ? [extra % 2 ? 118 : -118, 530 + extra * 96]
    : [-530 + (extra % 6) * 212, 330 + Math.floor(extra / 6) * 220];
}

export type Terrain = 'cyber' | 'mythic' | 'oriental' | 'guardian' | 'campus' | 'blueprint';

const TERRAIN: Record<ThemeKey, Terrain> = {
  brand: 'campus', cyber: 'cyber', mythic: 'mythic', oriental: 'oriental', guardian: 'guardian', campus: 'campus', blueprint: 'blueprint',
};

export const DEFAULT_BUILDING: Record<ThemeKey, BuildingKind> = {
  brand: 'hall', cyber: 'tower', mythic: 'altar', oriental: 'pagoda', guardian: 'treehouse', campus: 'school', blueprint: 'workshop',
};

const ACCENT: Record<ThemeKey, string> = {
  brand: '#c8a869', cyber: '#22e4ff', mythic: '#ffc76b', oriental: '#e8c872', guardian: '#ffd35a', campus: '#3563e9', blueprint: '#ffd166',
};

const PROPS: Record<Terrain, PropKind[]> = {
  cyber: ['spire', 'spire'],
  mythic: ['crystal', 'crystal', 'rock'],
  oriental: ['pine', 'lantern', 'pine'],
  guardian: ['tree', 'bush', 'tree'],
  campus: ['tree', 'lamp'],
  blueprint: ['lamp', 'rock'],
};

export interface IslandSpec {
  project: Project;
  order: number;
  x: number;
  y: number;
  r: number;
  terrain: Terrain;
  kind: BuildingKind;
  accent: string;
  /** 有機的島嶼外形（border-radius） */
  shape: string;
  props: { dx: number; dy: number; kind: PropKind }[];
}

export function layoutIslands(projects: Project[], portrait: boolean): IslandSpec[] {
  return projects.map((p, order) => {
    const [X, Y] = slotFor(order, portrait);
    const { x, y } = toPlane(X, Y);
    const rnd = mulberry32(order * 131 + 7);
    const v = () => Math.round(38 + rnd() * 24);
    const terrain = TERRAIN[p.theme];
    const r = p.category === 'personal' ? 104 : 90;
    // 小物放在島的後半圈（螢幕上方），不擋住建築正面
    const props = PROPS[terrain].map((kind, i) => {
      const ang = (225 + (i - (PROPS[terrain].length - 1) / 2) * 62) * (Math.PI / 180);
      const d = r * (0.66 + rnd() * 0.08);
      return { dx: Math.cos(ang) * d, dy: Math.sin(ang) * d, kind };
    });
    return {
      project: p, order, x, y, r, terrain, props,
      kind: p.building ?? DEFAULT_BUILDING[p.theme],
      accent: p.accent ?? ACCENT[p.theme],
      shape: `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`,
    };
  });
}

/** 能量橋樑：依序串連群島，修剪掉兩端落在島內的部分 */
export function bridgesFor(islands: IslandSpec[]) {
  const out: { key: string; x: number; y: number; len: number; angle: number; from: string; to: string }[] = [];
  for (let i = 0; i < islands.length - 1; i++) {
    const a = islands[i], b = islands[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const ux = dx / dist, uy = dy / dist;
    const sx = a.x + ux * a.r * 0.82, sy = a.y + uy * a.r * 0.82;
    const len = dist - a.r * 0.82 - b.r * 0.82;
    if (len <= 4) continue;
    out.push({ key: `${a.project.id}-${b.project.id}`, x: sx, y: sy, len, angle: (Math.atan2(uy, ux) * 180) / Math.PI, from: a.accent, to: b.accent });
  }
  return out;
}

/** 依視窗計算整個群島的縮放與垂直置中位移 */
export function stageFit(w: number, h: number, portrait: boolean) {
  if (portrait) {
    const s = Math.max(0.3, Math.min((w * 0.94) / 480, (h - 170) / 1080, 1));
    return { s, dy: 250 * s + 50 };
  }
  const s = Math.max(0.36, Math.min((w * 0.92) / 1270, (h - 190) / 640, 1.15));
  return { s, dy: 300 * s + 10 };
}
