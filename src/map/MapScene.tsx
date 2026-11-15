import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { LayoutGrid, MousePointerClick } from 'lucide-react';
import type { Project } from '../data/projects';
import { Wordmark } from '../components/Wordmark';
import { CanvasBoundary } from '../components/CanvasBoundary';
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
  const portrait = usePortrait();
  const enter = useCallback((id: string, screen: { x: number; y: number }) => {
    remember(id, screen);
    onEnter(id);
  }, [onEnter]);

  return (
    <div className={`map-scene ${portrait ? 'is-portrait' : ''}`}>
      <div className="map-canvas" data-nav-ignore>
        <CanvasBoundary label="此裝置無法顯示 3D 群島">
          <Suspense fallback={<div className="map-loading">正在召喚群島…</div>}>
            <MapWorld projects={projects} portrait={portrait} reducedMotion={reducedMotion} onEnter={enter} onMeasure={remember} />
          </Suspense>
        </CanvasBoundary>
      </div>

      <div className="map-overlay">
        <div className="map-brand">
          <p className="map-eyebrow">Portfolio &amp; Showcase</p>
          <Wordmark size="hero" className="wordmark-map" />
          <p className="map-lede">每一件作品，都是一座懸浮的微縮箱庭。<br />點擊島嶼，鏡頭將帶你飛進它的領域。</p>
        </div>
        <div className="map-hint">
          <span><MousePointerClick className="h-3.5 w-3.5" aria-hidden /> 拖曳旋轉 · 滾輪縮放 · 點擊島嶼進入</span>
          <button onClick={onIndex}><LayoutGrid className="h-3.5 w-3.5" aria-hidden /> 作品目錄</button>
        </div>
      </div>
    </div>
  );
}
