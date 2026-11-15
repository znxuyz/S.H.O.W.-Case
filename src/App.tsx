import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { visibleProjects, type Project } from './data/projects';
import { themes, type ThemeKey } from './themes';
import { useSceneNav } from './hooks/useSceneNav';
import { backgroundVariants, contentVariants } from './lib/transitions';
import { Wordmark } from './components/Wordmark';
import { DotNav, type NavItem } from './components/DotNav';
import { HeroScene } from './components/HeroScene';
import { OutroScene } from './components/OutroScene';
import { ProjectScene } from './components/ProjectScene';
import { IndexOverlay } from './components/IndexOverlay';

type Scene =
  | { kind: 'hero'; id: 'intro'; theme: ThemeKey; label: string }
  | { kind: 'outro'; id: 'fin'; theme: ThemeKey; label: string }
  | { kind: 'project'; id: string; theme: ThemeKey; label: string; project: Project; n: number };

export default function App() {
  const reducedMotion = useReducedMotion() ?? false;
  const [indexOpen, setIndexOpen] = useState(false);

  const scenes = useMemo<Scene[]>(
    () => [
      { kind: 'hero', id: 'intro', theme: 'brand', label: '序章' },
      ...visibleProjects.map((p, i) => ({ kind: 'project' as const, id: p.id, theme: p.theme, label: p.title, project: p, n: i + 1 })),
      { kind: 'outro', id: 'fin', theme: 'brand', label: '終章' },
    ],
    [],
  );
  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);
  const { index, dir, go, next, prev } = useSceneNav(ids, { enabled: !indexOpen });

  const scene = scenes[index];
  const theme = themes[scene.theme];
  const accent = scene.kind === 'project' ? scene.project.accent : undefined;
  const Bg = theme.Background;

  const navItems = useMemo<NavItem[]>(
    () => scenes.map((s) => ({ id: s.id, label: s.label, group: s.kind === 'project' ? s.project.category : 'brand' })),
    [scenes],
  );

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome);
    document.title = scene.kind === 'project' ? `${scene.project.title} · S.H.O.W. Case` : 'S.H.O.W. Case — Selected Hub Of Works';
  }, [theme, scene]);

  const openIndex = useCallback(() => setIndexOpen(true), []);
  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const pick = useCallback((id: string) => { setIndexOpen(false); go(ids.indexOf(id), true); }, [go, ids]);

  const rootStyle = (accent ? { ['--accent']: accent } : {}) as CSSProperties;

  return (
    <div className="app" data-theme={scene.theme} style={rootStyle}>
      {/* ── 背景世界：新主題以其專屬轉場覆蓋舊主題 ── */}
      <div className="layer-bg" aria-hidden>
        <AnimatePresence custom={dir} initial={false}>
          <motion.div
            key={scene.theme}
            className="absolute inset-0"
            custom={dir}
            variants={backgroundVariants(theme.enter, reducedMotion)}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<div className="absolute inset-0" style={{ background: theme.chrome }} />}>
              <Bg accent={accent} active reducedMotion={reducedMotion} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 前景內容 ── */}
      <main className="layer-content">
        <AnimatePresence custom={dir} initial={false}>
          <motion.section
            key={scene.id}
            data-theme={scene.theme}
            className="scene"
            style={rootStyle}
            custom={dir}
            variants={contentVariants(theme.enter, reducedMotion)}
            initial="initial"
            animate="animate"
            exit="exit"
            aria-roledescription="作品頁"
            aria-label={scene.label}
          >
            {scene.kind === 'hero' && <HeroScene projects={visibleProjects} onStart={next} onIndex={openIndex} reducedMotion={reducedMotion} />}
            {scene.kind === 'outro' && <OutroScene count={visibleProjects.length} onTop={() => go(0, true)} onIndex={openIndex} />}
            {scene.kind === 'project' && <ProjectScene project={scene.project} index={scene.n} total={visibleProjects.length} reducedMotion={reducedMotion} />}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* ── 導覽外框 ── */}
      <header className="chrome-top">
        <button className={`chrome-brand ${index === 0 ? 'is-hidden' : ''}`} onClick={() => go(0, true)} aria-label="回到序章" tabIndex={index === 0 ? -1 : 0}>
          <Wordmark size="nav" />
        </button>
        <button className="chrome-pill" onClick={openIndex}>
          <LayoutGrid className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">目錄</span>
        </button>
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
      <div className="progress-line" style={{ transform: `scaleX(${index / (scenes.length - 1)})` }} aria-hidden />

      <AnimatePresence>
        {indexOpen && <IndexOverlay projects={visibleProjects} current={scene.id} onPick={pick} onClose={closeIndex} />}
      </AnimatePresence>
    </div>
  );
}
