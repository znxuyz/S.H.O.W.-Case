import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from 'motion/react';
import { LayoutGrid, MousePointerClick } from 'lucide-react';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { Wordmark } from '../components/Wordmark';
import { Building, Prop, SPRITE } from './buildings';
import {
  bridgeGeometry, islandOutline, islandsFor, PLANE, placeProjects, scatterProps, trackPaths,
  type Island, type Placed,
} from './layout';
import './map.css';

/* ───────── 鏡頭俯衝的落點快取（建築在螢幕上的位置，給轉場使用） ───────── */
const origins = new Map<string, { x: number; y: number }>();
export function diveOrigin(id: string | undefined) {
  const o = id ? origins.get(id) : undefined;
  if (o) return { originX: o.x / window.innerWidth, originY: o.y / window.innerHeight };
  return { originX: 0.5, originY: 0.55 };
}

const BASE_RX = 55;
const BASE_RZ = 45;

function usePortrait() {
  const q = '(max-aspect-ratio: 4/5)';
  const [portrait, setPortrait] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setPortrait(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return portrait;
}

function useStageScale(portrait: boolean) {
  const calc = useCallback(() => {
    const w = window.innerWidth, h = window.innerHeight;
    const s = portrait ? Math.min((w * 0.92) / 640, (h - 190) / 980) : Math.min((w * 0.9) / 1260, (h - 230) / 560);
    return Math.max(0.32, Math.min(s, 1.15));
  }, [portrait]);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [calc]);
  return scale;
}

/* ───────── 浮島本體：多層切面堆疊出岩壁厚度與倒錐底部 ───────── */
const LAYERS = 18;
const ROCK = {
  personal: { rim: ['#3d6a48', '#5b4a35', '#4f3f2e'], from: [78, 62, 48], to: [24, 19, 16] },
  campus: { rim: ['#79a05a', '#8b7355', '#7a644a'], from: [96, 80, 62], to: [30, 24, 20] },
};

function IslandBody({ island, placed }: { island: Island; placed: Placed[] }) {
  const box = Math.round(island.r * 1.22);
  const size = box * 2;
  const clip = (seed: number, jitter: number) =>
    `polygon(${islandOutline(island.r, seed, jitter).map(([x, y]) => `${(x + box).toFixed(1)}px ${(y + box).toFixed(1)}px`).join(',')})`;
  const pal = ROCK[island.key];
  const frame: CSSProperties = { left: island.cx - box, top: island.cy - box, width: size, height: size };

  const layers = Array.from({ length: LAYERS }, (_, i) => {
    if (i === 0) return null;
    // 上段：垂直岩壁（不縮放）；下段：逐層內縮成倒錐狀的浮島底部
    const cliff = 7;
    const rim = i <= 2;
    const wall = i <= cliff;
    const z = wall ? -i * 5 : -cliff * 5 - (i - cliff) * 16;
    const s = wall ? 1 : 1 - (i - cliff) * 0.07;
    const k = rim ? 0 : (i - 3) / (LAYERS - 4);
    const c = rim ? pal.rim[i - 1] : `rgb(${pal.from.map((f, j) => Math.round(f + (pal.to[j] - f) * k)).join(',')})`;
    return (
      <div key={i} className="island-layer" style={{ ...frame, background: c, clipPath: clip(island.seed + (wall ? 0 : i), wall ? 1 : 3), transform: `translateZ(${z}px) scale(${s})` }} />
    );
  });

  const outline = islandOutline(island.r, island.seed);
  const poly = outline.map(([x, y]) => `${x},${y}`).join(' ');
  const inner = outline.map(([x, y]) => `${x * 0.86},${y * 0.86}`).join(' ');
  const mine = placed.filter((p) => p.island.key === island.key);
  const personal = island.key === 'personal';

  return (
    <div className="island-group" style={{ animationDelay: personal ? '0s' : '0.12s' }}>
      <div className="island-glow" style={{ left: island.cx - island.r, top: island.cy - island.r, width: island.r * 2, height: island.r * 2 }} />
      {layers}
      <div className="island-top" style={{ ...frame, clipPath: clip(island.seed, 1) }}>
        <svg viewBox={`${-box} ${-box} ${size} ${size}`} width={size} height={size}>
          <defs>
            <radialGradient id={`top-${island.key}`} cx="40%" cy="35%" r="75%">
              <stop offset="0" stopColor={personal ? '#4f8a62' : '#9cc477'} />
              <stop offset="1" stopColor={personal ? '#2a4e39' : '#6f9550'} />
            </radialGradient>
            <pattern id={`tile-${island.key}`} width="22" height="22" patternUnits="userSpaceOnUse">
              <rect width="22" height="22" fill="#e9dfc9" />
              <path d="M22 0H0V22" fill="none" stroke="#d3c6aa" strokeWidth="1" />
            </pattern>
            <pattern id={`grid-${island.key}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M14 0H0V14" fill="none" stroke="#22e4ff" strokeOpacity="0.35" strokeWidth="0.8" />
            </pattern>
          </defs>
          <polygon points={poly} fill={`url(#top-${island.key})`} />
          {personal ? (
            <polygon points={inner} fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="10" />
          ) : (
            <polygon points={inner} fill={`url(#tile-${island.key})`} />
          )}
          <polygon points={poly} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" />
          {mine.map((b) => {
            const x = b.x - island.cx, y = b.y - island.cy;
            if (!personal || !b.ground) {
              return <rect key={b.project.id} x={x - 50} y={y - 50} width={100} height={100} rx={18} fill="#f6efe0" stroke="#d6cbb2" strokeWidth={2} />;
            }
            return (
              <g key={b.project.id}>
                <circle cx={x} cy={y} r={66} fill={b.ground.fill} />
                {b.project.theme === 'cyber' && <circle cx={x} cy={y} r={66} fill={`url(#grid-${island.key})`} />}
                {b.project.theme === 'oriental' && <ellipse cx={x + 36} cy={y - 34} rx={26} ry={18} fill="#14303a" stroke="#e8c872" strokeOpacity="0.5" />}
                <circle cx={x} cy={y} r={66} fill="none" stroke={b.ground.stroke} strokeOpacity="0.55" strokeWidth="2" />
                <circle cx={x} cy={y} r={56} fill="none" stroke={b.ground.stroke} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 6" />
              </g>
            );
          })}
          {/* 島心能量核心 */}
          <g className="hub">
            <circle r={personal ? 34 : 30} fill={personal ? '#ffd27a22' : '#8ecae6'} stroke={personal ? '#ffd27a' : '#5aa9cf'} strokeWidth="2" />
            <circle r={personal ? 22 : 18} fill="none" stroke={personal ? '#ffd27a' : '#ffffff'} strokeWidth="1.2" strokeDasharray="4 5" className="hub-spin" />
            <circle r={7} fill={personal ? '#fff2c4' : '#ffffff'} className="glow-pulse" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Bridge({ islands }: { islands: Island[] }) {
  const g = bridgeGeometry(islands);
  const style: CSSProperties = { left: g.x, top: g.y - 17, width: g.length, transform: `translateZ(2px) rotate(${g.angle}deg)` };
  return (
    <div className="bridge" style={style}>
      <div className="bridge-under" />
      <div className="bridge-deck" />
      <div className="bridge-rail bridge-rail-a" />
      <div className="bridge-rail bridge-rail-b" />
    </div>
  );
}

function Tracks({ placed, islands }: { placed: Placed[]; islands: Island[] }) {
  const paths = useMemo(() => trackPaths(placed, islands), [placed, islands]);
  const color = (key: string) => placed.find((p) => p.project.id === key)?.accent ?? '#ffd27a';
  return (
    <svg className="tracks" width={PLANE} height={PLANE} viewBox={`0 0 ${PLANE} ${PLANE}`} aria-hidden>
      {paths.map((p, i) => {
        const c = p.main ? '#ffe2a0' : color(p.key);
        return (
          <g key={p.key} style={{ ['--d' as string]: `${0.6 + i * 0.07}s` }}>
            <path d={p.d} stroke={c} strokeOpacity={0.22} strokeWidth={p.main ? 10 : 7} fill="none" strokeLinecap="round" />
            <path d={p.d} stroke={c} strokeWidth={p.main ? 2.2 : 1.6} fill="none" pathLength={1} className="track-core" strokeLinecap="round" />
            <path d={p.d} stroke="#ffffff" strokeWidth={p.main ? 4 : 3.2} fill="none" pathLength={100} className={`track-flow ${i % 2 ? 'rev' : ''}`} strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

export function MapScene({
  projects, onEnter, onIndex, reducedMotion,
}: { projects: Project[]; onEnter: (id: string) => void; onIndex: () => void; reducedMotion: boolean }) {
  const portrait = usePortrait();
  const scale = useStageScale(portrait);
  const islands = useMemo(() => islandsFor(portrait), [portrait]);
  const placed = useMemo(() => placeProjects(projects, islands), [projects, islands]);
  const props = useMemo(() => scatterProps(placed, islands), [placed, islands]);
  const root = useRef<HTMLDivElement>(null);
  const [diving, setDiving] = useState<string | null>(null);

  /* ── 滑鼠追蹤：彈簧物理平滑轉動沙盤 ── */
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const sx = useSpring(nx, { stiffness: 55, damping: 16, mass: 0.9 });
  const sy = useSpring(ny, { stiffness: 55, damping: 16, mass: 0.9 });
  const rz = useTransform(sx, (v) => `${BASE_RZ + v * 9}deg`);
  const rx = useTransform(sy, (v) => `${BASE_RX - v * 7}deg`);
  const ry = useTransform(sx, (v) => v * 4);
  const lastMove = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      lastMove.current = performance.now();
      nx.set((e.clientX / window.innerWidth) * 2 - 1);
      ny.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [nx, ny, reducedMotion]);

  // 閒置（或觸控裝置）時沙盤緩慢自轉擺動
  useAnimationFrame((t) => {
    if (reducedMotion || performance.now() - lastMove.current < 3500) return;
    nx.set(Math.sin(t / 4200) * 0.55);
    ny.set(Math.sin(t / 5600) * 0.35);
  });

  /* ── 量測每座建築在螢幕上的位置，作為俯衝鏡頭的焦點 ── */
  const measure = useCallback((only?: string) => {
    root.current?.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      const id = el.dataset.anchor!;
      if (only && id !== only) return;
      const r = el.getBoundingClientRect();
      origins.set(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => measure(), 1900);
    const on = () => measure();
    window.addEventListener('resize', on);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', on); };
  }, [measure, scale, portrait]);

  const enter = (id: string) => {
    if (diving) return;
    measure(id);
    setDiving(id);
    window.setTimeout(() => onEnter(id), reducedMotion ? 0 : 280);
  };

  const varStyle = { '--rx': rx, '--rz': rz } as unknown as CSSProperties;
  const { TOP } = SPRITE;

  return (
    <motion.div ref={root} className={`map-scene ${portrait ? 'is-portrait' : ''}`} style={varStyle}>
      <div className="map-viewport">
        <motion.div className="map-tilt" style={{ scale, rotateY: ry, y: portrait ? '3vh' : '9vh', x: portrait ? 0 : '3vw' }}>
          <div className="map-board">
            <div className="void-shadow" />
            {islands.map((isl, i) => (
              <div key={`cloud-${isl.key}`} className="cloud" style={{ left: isl.cx - isl.r * (i ? 0.2 : 1.4), top: isl.cy + isl.r * (i ? 0.7 : 0.1), animationDelay: `${i * -9}s` }} />
            ))}
            {islands.map((isl) => <IslandBody key={isl.key} island={isl} placed={placed} />)}
            <Bridge islands={islands} />
            <Tracks placed={placed} islands={islands} />

            {islands.map((isl) => (
              <div key={`label-${isl.key}`} className="bb" style={{ left: isl.cx + isl.r * 0.86, top: isl.cy + isl.r * 0.86 }}>
                <div className="bb-stand">
                  <div className="island-label">
                    <span>{isl.label}</span>
                    <small>{isl.en}</small>
                  </div>
                </div>
              </div>
            ))}

            {props.map((p, i) => (
              <div key={p.key} className="bb" style={{ left: p.x, top: p.y }}>
                <div className="bb-stand"><div className="prop" style={{ animationDelay: `${0.9 + (i % 12) * 0.05}s` }}><Prop kind={p.kind} /></div></div>
              </div>
            ))}

            {placed.map((b) => {
              const theme = themes[b.project.theme];
              return (
                <button
                  key={b.project.id}
                  className={`bld ${diving === b.project.id ? 'is-diving' : ''}`}
                  style={{ left: b.x, top: b.y, ['--c' as string]: b.accent } as CSSProperties}
                  onClick={() => enter(b.project.id)}
                  onPointerEnter={() => measure(b.project.id)}
                  aria-label={`進入作品：${b.project.title}`}
                >
                  <span className="bld-shadow" />
                  <span className="bld-ring" />
                  <span className="bb-stand">
                    <span className="bld-pop" style={{ animationDelay: `${0.45 + b.order * 0.08}s` }}>
                      <span className="bld-body">
                        <Building kind={b.kind} accent={b.accent} />
                        <span className="bld-anchor" data-anchor={b.project.id} style={{ top: TOP * 0.55 }} />
                      </span>
                    </span>
                    <span className="bld-label" style={{ bottom: TOP * 0.74 }}>
                      <b>{b.project.title}</b>
                      <small>{theme.label}{b.project.status === 'dev' ? ' · 開發中' : b.project.status === 'maintenance' ? ' · 維修中' : ''}</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── 2D 疊層：品牌字標與操作提示 ── */}
      <div className="map-overlay">
        <div className="map-brand">
          <p className="map-eyebrow">Portfolio &amp; Showcase</p>
          <Wordmark size="hero" className="wordmark-map" />
          <p className="map-lede">每一件作品，都是一座獨立的世界。<br />點擊建築，俯衝進入它的領域。</p>
        </div>
        <div className="map-hint">
          <span><MousePointerClick className="h-3.5 w-3.5" aria-hidden /> 移動滑鼠轉動沙盤 · 點擊建築進入</span>
          <button onClick={onIndex}><LayoutGrid className="h-3.5 w-3.5" aria-hidden /> 作品目錄</button>
        </div>
      </div>
    </motion.div>
  );
}
