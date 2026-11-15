import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { themes } from '../themes';
import type { Project } from '../data/projects';

export function HeroScene({ projects, onStart, onIndex, reducedMotion }: { projects: Project[]; onStart: () => void; onIndex: () => void; reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const styles = [...new Set(projects.map((p) => themes[p.theme].label))];

  useLayoutEffect(() => {
    if (!root.current || reducedMotion) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.35 });
      tl.from('.wm-letter, .wm-dot', { yPercent: 110, opacity: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' })
        .from('.wm-case', { opacity: 0, x: -20, filter: 'blur(8px)', duration: 1, ease: 'power3.out' }, '-=0.7')
        .from('.wm-rule-line', { scaleX: 0, duration: 1.1, ease: 'expo.inOut' }, '-=0.6')
        .from('.wm-diamond', { scale: 0, rotate: 0, duration: 0.6, ease: 'back.out(3)' }, '-=0.6')
        .from('.wm-sub', { opacity: 0, letterSpacing: '1.2em', duration: 1.4, ease: 'expo.out' }, '-=0.8')
        .from('.reveal', { opacity: 0, y: 20, duration: 0.9, stagger: 0.1, ease: 'power3.out', clearProps: 'all' }, '-=0.9');
    }, root);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={root} className="hero">
      <p className="hero-eyebrow reveal">Portfolio &amp; Showcase</p>
      <Wordmark size="hero" />
      <p className="hero-lede reveal">每一件作品，都是一個獨立的世界。<br className="sm:hidden" />切換作品時，整個宇宙隨之改變。</p>
      <div className="hero-styles reveal">
        {styles.map((s) => <span key={s}>{s}</span>)}
      </div>
      <div className="hero-actions reveal">
        <button className="hero-btn hero-btn-primary" onClick={onStart}>開始瀏覽 <ChevronDown className="h-4 w-4" aria-hidden /></button>
        <button className="hero-btn" onClick={onIndex}><LayoutGrid className="h-4 w-4" aria-hidden /> 作品目錄</button>
      </div>
      <div className="hero-hint reveal" aria-hidden>
        <span className="mouse"><i /></span>
        <span>滾輪 · 方向鍵 · 滑動</span>
      </div>
    </div>
  );
}
