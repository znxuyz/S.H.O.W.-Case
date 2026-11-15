import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LayoutGrid, MousePointerClick } from 'lucide-react';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { Wordmark } from '../components/Wordmark';
import { Building, Prop, SPRITE } from './buildings';
import { bridgesFor, layoutIslands, stageFit, type IslandSpec } from './layout';
import './map.css';

/* ───────── 鏡頭俯衝焦點快取（建築在螢幕上的位置，給轉場使用） ───────── */
const origins = new Map<string, { x: number; y: number }>();
export function diveOrigin(id: string | undefined) {
  const o = id ? origins.get(id) : undefined;
  if (o) return { originX: o.x / window.innerWidth, originY: o.y / window.innerHeight };
  return { originX: 0.5, originY: 0.55 };
}

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

/**
 * 滑鼠視差傾斜：直接寫入 DOM transform，以 requestAnimationFrame 內插，
 * 收斂後自動停止迴圈；過程中不觸發任何 React 重新渲染。
 */
function useStageTilt(tilt: React.RefObject<HTMLDivElement | null>, portrait: boolean, reduced: boolean) {
  useEffect(() => {
    const el = tilt.current;
    if (!el) return;
    let fit = stageFit(window.innerWidth, window.innerHeight, portrait);
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const write = () => {
      el.style.transform =
        `translate3d(${portrait ? 0 : 4}vw, ${fit.dy.toFixed(1)}px, 0) scale(${fit.s.toFixed(4)}) ` +
        `rotateX(${(-cy * 6).toFixed(3)}deg) rotateY(${(cx * 8).toFixed(3)}deg)`;
    };
    const tick = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      write();
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0008 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || reduced) return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    const onResize = () => { fit = stageFit(window.innerWidth, window.innerHeight, portrait); write(); };
    write();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [tilt, portrait, reduced]);
}

/* ───────── 單座浮空島 ───────── */
const UNDER = [
  { z: -6, s: 1 },
  { z: -13, s: 0.97 },
  { z: -26, s: 0.84 },
  { z: -42, s: 0.66 },
  { z: -60, s: 0.46 },
  { z: -80, s: 0.26 },
];

function FloatingIsland({ spec, diving, onEnter, onHover }: {
  spec: IslandSpec; diving: boolean; onEnter: (id: string) => void; onHover: (id: string) => void;
}) {
  const { project: p, r, x, y, shape, terrain, accent } = spec;
  const theme = themes[p.theme];
  const size = r * 2;
  const frame: CSSProperties = { left: x - r, top: y - r, width: size, height: size, borderRadius: shape };
  const status = p.status === 'dev' ? ' · 開發中' : p.status === 'maintenance' ? ' · 維修中' : '';

  return (
    <div className={`isle isle-${terrain}`} style={{ ['--c' as string]: accent } as CSSProperties}>
      <div className="isle-core" style={{ left: x - r * 0.6, top: y - r * 0.6, width: r * 1.2, height: r * 1.2 }} />
      {UNDER.map((u, i) => (
        <div key={i} className={`isle-under isle-under-${i}`} style={{ ...frame, transform: `translateZ(${u.z}px) scale(${u.s})` }} />
      ))}
      <div className="isle-top" style={frame}>
        <span className="isle-detail" />
      </div>

      {spec.props.map((pr, i) => (
        <div key={i} className="bb" style={{ left: x + pr.dx, top: y + pr.dy }}>
          <div className="bb-stand"><div className="prop"><Prop kind={pr.kind} /></div></div>
        </div>
      ))}

      <button
        className={`bld ${diving ? 'is-diving' : ''}`}
        style={{ left: x, top: y }}
        onClick={() => onEnter(p.id)}
        onPointerEnter={() => onHover(p.id)}
        onFocus={() => onHover(p.id)}
        aria-label={`進入作品：${p.title}`}
      >
        <span className="bld-ring" />
        <span className="bld-shadow" />
        <span className="bb-stand">
          <span className="bld-pop" style={{ animationDelay: `${0.35 + spec.order * 0.07}s` }}>
            <span className="bld-body">
              <span className="bld-glow" />
              <Building kind={spec.kind} accent={accent} />
              <span className="bld-anchor" data-anchor={p.id} style={{ top: SPRITE.TOP * 0.55 }} />
            </span>
          </span>
          <span className="bld-label" style={{ bottom: SPRITE.TOP * 0.74 }}>
            <b>{p.title}</b>
            <small>{theme.label}{status}</small>
          </span>
        </span>
      </button>
    </div>
  );
}

export function MapScene({
  projects, onEnter, onIndex, reducedMotion,
}: { projects: Project[]; onEnter: (id: string) => void; onIndex: () => void; reducedMotion: boolean }) {
  const portrait = usePortrait();
  const islands = useMemo(() => layoutIslands(projects, portrait), [projects, portrait]);
  const bridges = useMemo(() => bridgesFor(islands), [islands]);
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const [diving, setDiving] = useState<string | null>(null);
  useStageTilt(tilt, portrait, reducedMotion);

  /* 量測建築在螢幕上的位置，作為俯衝鏡頭焦點 */
  const measure = useCallback((only?: string) => {
    root.current?.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      const id = el.dataset.anchor!;
      if (only && id !== only) return;
      const r = el.getBoundingClientRect();
      origins.set(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => measure(), 1600);
    const on = () => measure();
    window.addEventListener('resize', on);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', on); };
  }, [measure, portrait]);

  const divingRef = useRef(false);
  const enter = useCallback((id: string) => {
    if (divingRef.current) return;
    divingRef.current = true;
    measure(id);
    setDiving(id);
    window.setTimeout(() => onEnter(id), reducedMotion ? 0 : 260);
  }, [measure, onEnter, reducedMotion]);

  return (
    <div ref={root} className={`map-scene ${portrait ? 'is-portrait' : ''}`}>
      <div className="map-viewport">
        <div ref={tilt} className="map-tilt">
          <div className="map-board">
            {bridges.map((b) => (
              <div
                key={b.key}
                className="beam"
                style={{ left: b.x, top: b.y - 3, width: b.len, transform: `translateZ(-3px) rotate(${b.angle}deg)`, ['--a' as string]: b.from, ['--b' as string]: b.to, ['--len' as string]: `${b.len}px` } as CSSProperties}
              >
                <span className="beam-spark" />
                <span className="beam-spark beam-spark-2" />
              </div>
            ))}
            {islands.map((spec) => (
              <FloatingIsland key={spec.project.id} spec={spec} diving={diving === spec.project.id} onEnter={enter} onHover={measure} />
            ))}
          </div>
        </div>
      </div>

      <div className="map-overlay">
        <div className="map-brand">
          <p className="map-eyebrow">Portfolio &amp; Showcase</p>
          <Wordmark size="hero" className="wordmark-map" />
          <p className="map-lede">每一件作品，都是一座獨立的浮空島。<br />點擊島嶼，俯衝進入它的領域。</p>
        </div>
        <div className="map-hint">
          <span><MousePointerClick className="h-3.5 w-3.5" aria-hidden /> 移動滑鼠轉動群島 · 點擊島嶼進入</span>
          <button onClick={onIndex}><LayoutGrid className="h-3.5 w-3.5" aria-hidden /> 作品目錄</button>
        </div>
      </div>
    </div>
  );
}
