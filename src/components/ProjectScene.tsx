import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Hammer, Wrench, Archive, ChevronLeft, ChevronRight, X, Info, MonitorSmartphone, Maximize2, Play, Pause, Clapperboard } from 'lucide-react';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { playSceneIntro } from '../lib/titleFx';
import { ProjectStage } from './MediaPanel';
import type { CardRefs } from '../three/Hotspots';
import { Showcase } from './Showcase';
import { GitHubIcon } from './icons';
import { play } from '../lib/sound';

// 影片燈箱延遲載入：連播放器程式碼都等使用者按下按鈕才下載
const VideoModal = lazy(() => import('./VideoModal').then((m) => ({ default: m.VideoModal })));

const STATUS = {
  live: { label: '上線中', icon: null },
  dev: { label: '開發中', icon: Hammer },
  maintenance: { label: '維修中', icon: Wrench },
  archived: { label: '已停用', icon: Archive },
} as const;

/**
 * 作品介紹頁：空間化敘事。
 * 畫面只保留左上角的極簡標題卡與按鈕；功能介紹綁在 3D 模型的熱點上，
 * 點擊熱點 → 鏡頭聚焦 → 彈出說明卡；完整文字收在「關於此作品」抽屜。
 */
export function ProjectScene({ project, index, total, reducedMotion }: { project: Project; index: number; total: number; reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const theme = themes[project.theme];
  const status = STATUS[project.status];
  const hotspots = project.hotspots ?? [];
  const [active, setActive] = useState<number | null>(null);
  const [panel, setPanel] = useState<'none' | 'about' | 'preview'>('none');
  const markers = useRef<(HTMLElement | null)[]>([]);
  const cardRefs = useRef<CardRefs>({ card: null, line: null });
  const [pulse, setPulse] = useState(0);
  // 3D 島嶼預熱完成前不顯示熱點標記（避免標籤浮在空中、壓住載入遮罩）
  const [stageReady, setStageReady] = useState(false);
  const onStageReady = useCallback(() => setStageReady(true), []);

  // ── 自動導覽：依序聚焦每個熱點（觸發專屬動畫＋說明卡），停留後切到下一個；播完回全景 ──
  const [auto, setAuto] = useState(false);
  const [video, setVideo] = useState(false);
  const closeVideo = useCallback(() => setVideo(false), []);
  const dwellMs = (i: number | null) => (i === null || !hotspots[i] ? 0 : Math.min(11000, Math.max(6000, 4500 + hotspots[i].body.length * 55)));
  const toggleAuto = useCallback(() => {
    if (auto) { setAuto(false); return; }
    setAuto(true);
    setPanel('none');
    if (active === null) { setActive(0); setPulse((p) => p + 1); }
  }, [auto, active]);
  useEffect(() => {
    if (!auto || !stageReady || active === null) return;
    const t = window.setTimeout(() => {
      if (active >= hotspots.length - 1) { setAuto(false); setActive(null); return; }
      setActive(active + 1);
      setPulse((p) => p + 1);
    }, dwellMs(active));
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, stageReady, active, hotspots.length]);
  // 使用者一旦拖曳、滾輪縮放、點任何按鈕或按鍵 → 自動暫停（播放按鈕本身除外）
  useEffect(() => {
    if (!auto) return;
    const stop = (e: Event) => { if ((e.target as HTMLElement | null)?.closest?.('.tour-play')) return; setAuto(false); };
    const opts = { capture: true, passive: true } as const;
    ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((n) => window.addEventListener(n, stop, opts));
    return () => ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((n) => window.removeEventListener(n, stop, opts));
  }, [auto]);
  const accent = project.accent ?? 'var(--accent)';
  // 熱點觸發動畫時的主題音效（音效關閉時零成本）
  useEffect(() => { if (active !== null) play('select', project.theme); }, [active, pulse, project.theme]);

  useLayoutEffect(() => {
    if (!root.current) return;
    return playSceneIntro(root.current, theme.title, reducedMotion);
  }, [theme.title, reducedMotion]);

  const pick = useCallback((i: number | null) => { setActive(i); if (i !== null) { setPanel('none'); setPulse((p) => p + 1); } }, []);
  const step = useCallback((d: number) => {
    if (!hotspots.length) return;
    setActive((a) => (a === null ? (d > 0 ? 0 : hotspots.length - 1) : (a + d + hotspots.length) % hotspots.length));
    setPanel('none');
    setPulse((p) => p + 1);
  }, [hotspots.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActive(null); setPanel('none'); }
      if (active !== null && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, step]);

  const num = String(index).padStart(2, '0');
  const StatusIcon = status.icon;
  const h = active !== null ? hotspots[active] : null;

  return (
    <>
      <ProjectStage project={project} reducedMotion={reducedMotion} active={active} onPick={pick} markers={markers} cardRefs={cardRefs} pulse={pulse} onReady={onStageReady} paused={video} />
      {/* 3D 熱點標記（位置由舞台每幀投影寫入） */}
      <div className={`hs-layer ${stageReady ? 'is-ready' : ''}`} aria-label="模型上的導覽標記">
        {hotspots.map((hs, i) => (
          <div key={i} ref={(el) => { markers.current[i] = el; }} className={`hs-anchor ${active === i ? 'is-active' : ''}`} style={{ visibility: 'hidden' }}>
            <button
              className={`hs-dot ${active === i ? 'is-active' : ''} ${active !== null && active !== i ? 'is-dim' : ''}`}
              style={{ ['--c' as string]: accent }}
              onClick={() => pick(i)}
              aria-label={`導覽 ${i + 1}：${hs.title}`}
            >
              <span className="hs-num">{i + 1}</span>
              <span className="hs-label">{hs.title}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="corner-veil" aria-hidden />

      <div ref={root} className={`tour scene-${project.theme} ${h ? 'is-focused' : ''}`}>
        {/* 左上：極簡標題卡 */}
        <header className="tour-title">
          <div className="sc-kicker reveal">
            <span className="sc-num">{num}<span className="opacity-50"> / {String(total).padStart(2, '0')}</span></span>
            <span className="sc-kicker-sep" />
            <span>{theme.label}</span>
            <span className={`sc-status sc-status-${project.status}`}>
              {StatusIcon ? <StatusIcon className="h-3 w-3" aria-hidden /> : <span className="sc-pulse" aria-hidden />}
              {status.label}
            </span>
          </div>
          <h2 className="sc-title">{project.title}</h2>
          <p className="sc-tagline reveal">{project.tagline}</p>
          <div className="sc-actions reveal">
            {project.links.demo ? (
              <a className="sc-btn sc-btn-primary" href={project.links.demo} target="_blank" rel="noopener noreferrer">
                <span>{project.links.demoLabel ?? 'Live Demo'}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <span className="sc-btn sc-btn-disabled" aria-disabled="true"><Hammer className="h-4 w-4" aria-hidden /> <span>開發中</span></span>
            )}
            <a className="sc-btn sc-btn-secondary" href={project.links.repo} target="_blank" rel="noopener noreferrer">
              <GitHubIcon /><span>Source Code</span>
            </a>
            {project.videoUrl && (
              <button className="sc-btn sc-btn-secondary sc-btn-video" onClick={() => setVideo(true)}>
                <Clapperboard className="h-4 w-4" aria-hidden /><span>觀看演示影片</span>
              </button>
            )}
          </div>
          <div className="tour-links reveal">
            <button className={panel === 'about' ? 'is-on' : ''} onClick={() => { setPanel(panel === 'about' ? 'none' : 'about'); setActive(null); }}>
              <Info className="h-3.5 w-3.5" aria-hidden /> 關於此作品
            </button>
            {project.showcase && (
              <button className={panel === 'preview' ? 'is-on' : ''} onClick={() => { setPanel(panel === 'preview' ? 'none' : 'preview'); setActive(null); }}>
                <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden /> 網站預覽
              </button>
            )}
          </div>
        </header>

        {/* 底部：導覽列 */}
        {hotspots.length > 0 && (
          <nav className="tour-strip reveal" aria-label="空間導覽">
            <button
              className={`tour-play ${auto ? 'is-playing' : ''}`}
              onClick={toggleAuto}
              aria-pressed={auto}
              aria-label={auto ? '暫停自動導覽' : '自動導覽：依序介紹每個功能'}
              title={auto ? '暫停自動導覽' : '自動導覽'}
            >
              {auto ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
              <span>{auto ? '暫停' : '自動導覽'}</span>
              {auto && active !== null && <i key={`${active}-${pulse}`} className="tour-play-bar" style={{ animationDuration: `${dwellMs(active)}ms` }} aria-hidden />}
            </button>
            {hotspots.map((hs, i) => (
              <button key={i} className={active === i ? 'is-on' : ''} onClick={() => pick(active === i ? null : i)} aria-pressed={active === i}>
                <b>{i + 1}</b><span>{hs.title}</span>
              </button>
            ))}
            {active !== null && (
              <button className="tour-home" onClick={() => pick(null)} aria-label="回到全景"><Maximize2 className="h-3.5 w-3.5" aria-hidden /> 全景</button>
            )}
          </nav>
        )}

        {/* 熱點說明卡 */}
        {h && <div className="tour-leader" ref={(el) => { cardRefs.current.line = el; }} style={{ visibility: 'hidden', ['--c' as string]: accent }} aria-hidden />}
        {h && (
          <aside className="tour-card tour-card-float" key={active} ref={(el) => { cardRefs.current.card = el; }} style={{ visibility: typeof window !== 'undefined' && window.innerWidth >= 768 ? 'hidden' : undefined }} role="dialog" aria-label={h.title}>
            <div className="tour-card-head">
              <span className="tour-card-num">{String(active! + 1).padStart(2, '0')}<small> / {String(hotspots.length).padStart(2, '0')}</small></span>
              <button onClick={() => pick(null)} aria-label="關閉說明"><X className="h-4 w-4" /></button>
            </div>
            <h3>{h.title}</h3>
            <p>{h.body}</p>
            {h.video && project.videoUrl && (
              <button className="tour-card-video" onClick={() => setVideo(true)}>
                <Play className="h-3.5 w-3.5" aria-hidden /> 觀看演示影片
              </button>
            )}
            <div className="tour-card-nav">
              <button onClick={() => step(-1)} aria-label="上一個"><ChevronLeft className="h-4 w-4" /> 上一個</button>
              <button onClick={() => step(1)} aria-label="下一個">下一個 <ChevronRight className="h-4 w-4" /></button>
            </div>
          </aside>
        )}

        {/* 關於此作品 / 網站預覽 抽屜 */}
        {panel === 'about' && (
          <aside className="tour-card tour-about" role="dialog" aria-label="關於此作品">
            <div className="tour-card-head">
              {project.code && <span className="tour-card-code">{project.code}</span>}
              <button onClick={() => setPanel('none')} aria-label="關閉"><X className="h-4 w-4" /></button>
            </div>
            <p>{project.description}</p>
            <ul className="sc-highlights">{project.highlights.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="sc-tags">{project.tech.map((t) => <span key={t}>{t}</span>)}</div>
            {project.note && <p className="sc-note">※ {project.note}</p>}
          </aside>
        )}
        {panel === 'preview' && (
          <aside className="tour-preview" role="dialog" aria-label="網站預覽">
            <button className="tour-preview-close" onClick={() => setPanel('none')} aria-label="關閉"><X className="h-4 w-4" /></button>
            <Showcase project={project} />
          </aside>
        )}
      </div>
      {video && project.videoUrl && (
        <Suspense fallback={null}>
          <VideoModal url={project.videoUrl} highlightUrl={project.videoHighlightUrl} poster={project.videoPoster} originalUrl={project.videoOriginalUrl} title={project.title} onClose={closeVideo} />
        </Suspense>
      )}
    </>
  );
}
