import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronUp, LayoutGrid, Map as MapIcon, Volume2, VolumeX } from 'lucide-react';
import { play, setSoundEnabled, useSoundEnabled } from './lib/sound';
import { markVisited } from './lib/footprint';
import { visit } from './lib/counter';
import { visibleProjects, type Project } from './data/projects';
import { themes, type ThemeKey } from './themes';
import { useSceneNav } from './hooks/useSceneNav';
import { backgroundVariants, mapVariants, projectVariants, contentVariants, type NavCustom } from './lib/transitions';
import { Wordmark } from './components/Wordmark';
import { DotNav, type NavItem } from './components/DotNav';
import { MapScene, diveOrigin } from './map/MapScene';
import { OutroScene } from './components/OutroScene';
import { ProjectScene } from './components/ProjectScene';
import { IndexOverlay } from './components/IndexOverlay';

const OutroBackground = lazy(() => import('./components/OutroBackground'));

type Scene =
  | { kind: 'map'; id: 'map'; theme: ThemeKey; label: string }
  | { kind: 'outro'; id: 'fin'; theme: ThemeKey; label: string }
  | { kind: 'project'; id: string; theme: ThemeKey; label: string; project: Project; n: number };

export default function App() {
  const reducedMotion = useReducedMotion() ?? false;
  const [indexOpen, setIndexOpen] = useState(false);

  const scenes = useMemo<Scene[]>(
    () => [
      { kind: 'map', id: 'map', theme: 'brand', label: '大地圖' },
      ...visibleProjects.map((p, i) => ({ kind: 'project' as const, id: p.id, theme: p.theme, label: p.title, project: p, n: i + 1 })),
      { kind: 'outro', id: 'fin', theme: 'brand', label: '終章' },
    ],
    [],
  );
  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);
  const { index, dir, from, go, next, prev } = useSceneNav(ids, { enabled: !indexOpen });

  const scene = scenes[index];
  const theme = themes[scene.theme];
  const accent = scene.kind === 'project' ? scene.project.accent : undefined;

  const navItems = useMemo<NavItem[]>(
    () => scenes.map((s) => ({ id: s.id, label: s.label, group: s.kind === 'project' ? s.project.category : 'brand' })),
    [scenes],
  );

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome);
  }, [theme]);

  // 切換主題領域：播放該主題的進場音色（音效關閉時零成本）；記錄探索足跡
  const sound = useSoundEnabled();
  const firstScene = useRef(true);
  useEffect(() => {
    if (firstScene.current) { firstScene.current = false; return; }
    play('theme', scene.theme);
  }, [scene.id, scene.theme]);
  useEffect(() => { if (scene.kind === 'project') markVisited(scene.id); }, [scene]);
  // 全站總瀏覽：每次造訪計一次（請求延後到頁面閒置才送）
  useState(() => visit('site-views')); // 在子元件讀取前就登記「本次造訪 +1」

  const openIndex = useCallback(() => setIndexOpen(true), []);
  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const pick = useCallback((id: string) => { setIndexOpen(false); go(ids.indexOf(id), true); }, [go, ids]);

  const rootStyle = (accent ? { ['--accent']: accent } : {}) as CSSProperties;
  const enterProject = useCallback((id: string) => go(ids.indexOf(id), true), [go, ids]);

  // 轉場參數：方向、是否由大地圖俯衝而來、鏡頭焦點（建築在螢幕上的位置）
  const fromMap = from === 0 && scene.kind === 'project';
  const custom: NavCustom = {
    dir,
    fromMap,
    origin: diveOrigin(scene.kind === 'map' ? scenes[from]?.id : scene.id),
  };
  const sceneVariants =
    scene.kind === 'map' ? mapVariants(reducedMotion)
      : scene.kind === 'project' ? projectVariants(theme.enter, reducedMotion)
        : contentVariants(theme.enter, reducedMotion);

  return (
    <div className="app" data-theme={scene.theme} style={rootStyle}>
      {/* ── 背景世界：新主題以其專屬轉場覆蓋舊主題 ── */}
      <div className="layer-bg" aria-hidden>
        <AnimatePresence custom={custom} initial={false}>
          <motion.div
            key={scene.theme}
            className="absolute inset-0"
            custom={custom}
            variants={backgroundVariants(theme.enter, reducedMotion)}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* 大地圖與作品頁的背景都在 3D 舞台裡；這層只在載入 / 轉場瞬間露出，用主題色漸層即可 */}
            {scene.kind === 'outro' ? (
              <Suspense fallback={<div className="absolute inset-0" style={{ background: theme.chrome }} />}>
                <OutroBackground reducedMotion={reducedMotion} />
              </Suspense>
            ) : (
              <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 60% 40%, color-mix(in srgb, ${theme.chrome} 70%, #ffffff 10%), ${theme.chrome})` }} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 前景內容 ── */}
      <main className="layer-content">
        <AnimatePresence custom={custom} initial={false}>
          <motion.section
            key={scene.id}
            data-theme={scene.theme}
            className="scene"
            style={rootStyle}
            custom={custom}
            variants={sceneVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            aria-roledescription="作品頁"
            aria-label={scene.label}
          >
            {scene.kind === 'map' && <MapScene projects={visibleProjects} onEnter={enterProject} onIndex={openIndex} reducedMotion={reducedMotion} />}
            {scene.kind === 'outro' && <OutroScene projects={visibleProjects} onTop={() => go(0, true)} onIndex={openIndex} />}
            {scene.kind === 'project' && <ProjectScene project={scene.project} index={scene.n} total={visibleProjects.length} reducedMotion={reducedMotion} />}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* ── 導覽外框 ── */}
      <header className="chrome-top">
        <button className={`chrome-brand ${index === 0 ? 'is-hidden' : ''}`} onClick={() => go(0, true)} aria-label="返回大地圖" tabIndex={index === 0 ? -1 : 0}>
          <Wordmark size="nav" />
        </button>
        <div className="flex gap-2">
          {index !== 0 && (
            <button className="chrome-pill" onClick={() => go(0, true)}>
              <MapIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">返回大地圖</span>
            </button>
          )}
          <button
            className={`chrome-pill chrome-sound ${sound ? 'is-on' : ''}`}
            onClick={() => setSoundEnabled(!sound)}
            aria-pressed={sound}
            aria-label={sound ? '關閉互動音效' : '開啟互動音效'}
            title={sound ? '關閉互動音效' : '開啟互動音效'}
          >
            {sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            <span className="hidden sm:inline">{sound ? '音效開' : '音效'}</span>
          </button>
          <button className="chrome-pill" onClick={openIndex}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">目錄</span>
          </button>
        </div>
      </header>

      <DotNav items={navItems} index={index} onGo={(i) => go(i, true)} />

      <footer className="chrome-bottom">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={scene.kind === 'project' ? theme.key : scene.id} className="chrome-style" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
            <span className="opacity-50">STYLE ·</span> {scene.kind === 'project' ? theme.label : scene.label}
          </motion.span>
        </AnimatePresence>
        <div className="chrome-arrows">
          <button onClick={prev} disabled={index === 0} aria-label="上一個作品"><ChevronUp className="h-4 w-4" /></button>
          <span className="font-mono text-xs tabular-nums">{String(index).padStart(2, '0')}<span className="opacity-40">/{String(scenes.length - 1).padStart(2, '0')}</span></span>
          <button onClick={next} disabled={index === scenes.length - 1} aria-label="下一個作品"><ChevronDown className="h-4 w-4" /></button>
        </div>
      </footer>
      {fromMap && !reducedMotion && (
        <div
          key={`warp-${index}`}
          className="warp"
          style={{ ['--ox' as string]: `${custom.origin.originX * 100}%`, ['--oy' as string]: `${custom.origin.originY * 100}%` } as CSSProperties}
          aria-hidden
        />
      )}
      <div className="progress-line" style={{ transform: `scaleX(${index / (scenes.length - 1)})` }} aria-hidden />

      <AnimatePresence>
        {indexOpen && <IndexOverlay projects={visibleProjects} current={scene.id} onPick={pick} onClose={closeIndex} />}
      </AnimatePresence>
    </div>
  );
}
