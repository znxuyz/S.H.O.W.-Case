import { useIsPresent } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, Eye, LayoutGrid, MousePointerClick } from 'lucide-react';
import { useVisited } from '../lib/footprint';
import { fmtCount, useCount } from '../lib/counter';
import type { Project } from '../data/projects';
import { Wordmark } from '../components/Wordmark';
import { CanvasBoundary } from '../components/CanvasBoundary';
import { themes, type ThemeKey } from '../themes';
import { play } from '../lib/sound';
import './map.css';

const MapWorld = lazy(() => import('../three/MapWorld'));

/* ───────── 鏡頭焦點快取（島嶼在螢幕上的位置，給 2D 轉場使用） ───────── */
const origins = new Map<string, { x: number; y: number }>();
export function diveOrigin(id: string | undefined) {
  const o = id ? origins.get(id) : undefined;
  if (o) return { originX: o.x / window.innerWidth, originY: o.y / window.innerHeight };
  return { originX: 0.5, originY: 0.55 };
}
const remember = (id: string, p: { x: number; y: number }) => { origins.set(id, p); };

const PORTRAIT_Q = '(max-aspect-ratio: 4/5)';
function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_Q).matches);
  useEffect(() => {
    const m = window.matchMedia(PORTRAIT_Q);
    const on = () => setPortrait(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return portrait;
}

export function MapScene({
  projects, onEnter, onIndex, reducedMotion,
}: { projects: Project[]; onEnter: (id: string) => void; onIndex: () => void; reducedMotion: boolean }) {
  // 頁面離場（轉場中）時讓 3D 停止渲染
  const present = useIsPresent();
  const portrait = usePortrait();
  // 探索護照與全站人次（連不上計數端點時不顯示人次）
  const visitedIds = useVisited();
  const seen = projects.filter((p) => visitedIds.includes(p.id)).length;
  const views = useCount('site-views');
  // 分類聚光燈：全部／個人創作／校園專案＋作品中出現的每種主題風格
  const [filter, setFilter] = useState('all');
  const chips = useMemo(() => {
    const cats: { key: string; label: string; n: number; flavor: ThemeKey }[] = [
      { key: 'all', label: '全部', n: projects.length, flavor: 'brand' },
      { key: 'cat:personal', label: '個人創作', n: projects.filter((p) => p.category === 'personal').length, flavor: 'brand' },
      { key: 'cat:campus', label: '校園專案', n: projects.filter((p) => p.category === 'campus').length, flavor: 'campus' },
    ];
    const seen = [...new Set(projects.map((p) => p.theme))];
    const styles = seen.map((t) => ({ key: `theme:${t}`, label: themes[t].label, n: projects.filter((p) => p.theme === t).length, flavor: t }));
    return { cats: cats.filter((c) => c.n > 0), styles: styles.length > 1 ? styles : [] };
  }, [projects]);
  const choose = (key: string, flavor: ThemeKey) => {
    const next = key === filter && key !== 'all' ? 'all' : key; // 再按一次取消
    setFilter(next);
    play('select', next === 'all' ? 'brand' : flavor);
  };
  const enter = useCallback((id: string, screen: { x: number; y: number }) => {
    remember(id, screen);
    onEnter(id);
  }, [onEnter]);

  return (
    <div className={`map-scene ${portrait ? 'is-portrait' : ''}`}>
      <div className="map-canvas" data-nav-ignore>
        <CanvasBoundary label="此裝置無法顯示 3D 群島">
          <Suspense fallback={<div className="map-loading">正在召喚群島…</div>}>
            <MapWorld projects={projects} portrait={portrait} reducedMotion={reducedMotion} onEnter={enter} onMeasure={remember} live={present} filter={filter} visited={visitedIds} />
          </Suspense>
        </CanvasBoundary>
      </div>

      <div className="map-overlay">
        <div className="map-brand">
          <p className="map-eyebrow">Portfolio &amp; Showcase</p>
          <Wordmark size="hero" className="wordmark-map" />
          <p className="map-lede">每一件作品，都是一座懸浮的微縮箱庭。<br />點擊島嶼，鏡頭將帶你飛進它的領域。</p>
          <div className="map-passport" aria-label="探索護照">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            <span>已探索 <b>{seen}</b> / {projects.length} 座領域</span>
            <span className="map-passport-bar" aria-hidden><i style={{ transform: `scaleX(${projects.length ? seen / projects.length : 0})` }} /></span>
            {typeof views === 'number' && views > 0 && (
              <span className="map-passport-views" title="全站累計探索人次"><Eye className="h-3 w-3" aria-hidden /> {fmtCount(views)}</span>
            )}
          </div>
        </div>
        <nav className="map-filter" aria-label="依分類聚焦島嶼" data-nav-ignore>
          {chips.cats.map((c) => (
            <button key={c.key} className={filter === c.key ? 'is-on' : ''} aria-pressed={filter === c.key} onClick={() => choose(c.key, c.flavor)}>
              {c.label}<small>{c.n}</small>
            </button>
          ))}
          {chips.styles.length > 0 && <i aria-hidden />}
          {chips.styles.map((c) => (
            <button key={c.key} className={filter === c.key ? 'is-on' : ''} aria-pressed={filter === c.key} onClick={() => choose(c.key, c.flavor)}>
              {c.label}<small>{c.n}</small>
            </button>
          ))}
        </nav>
        <div className="map-hint">
          <span><MousePointerClick className="h-3.5 w-3.5" aria-hidden /> 拖曳旋轉 · 滾輪縮放 · 點擊島嶼進入</span>
          <button onClick={onIndex}><LayoutGrid className="h-3.5 w-3.5" aria-hidden /> 作品目錄</button>
        </div>
      </div>
    </div>
  );
}
