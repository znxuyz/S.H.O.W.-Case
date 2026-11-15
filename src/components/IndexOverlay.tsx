import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, ArrowUpRight } from 'lucide-react';
import type { Project } from '../data/projects';
import { themes } from '../themes';

const GROUPS: { key: Project['category']; title: string; en: string }[] = [
  { key: 'personal', title: '個人創作', en: 'Personal Works' },
  { key: 'campus', title: '校園專案', en: 'Campus Tools' },
];

const STATUS_LABEL = { live: '上線中', dev: '開發中', maintenance: '維修中', archived: '已停用' };

export function IndexOverlay({ projects, current, onPick, onClose }: { projects: Project[]; current: string; onPick: (id: string) => void; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let n = 0;
  return (
    <motion.div
      className="index-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="作品目錄"
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(18px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      transition={{ duration: 0.4 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="index-panel"
        data-scroll
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ y: 20, opacity: 0 }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.4em] text-[#c8a869]">INDEX</p>
            <h2 className="mt-2 font-display text-3xl text-[#f3ead6] sm:text-4xl">作品目錄</h2>
          </div>
          <button ref={closeBtn} onClick={onClose} className="index-close" aria-label="關閉目錄"><X className="h-5 w-5" /></button>
        </div>
        {GROUPS.map((g) => {
          const list = projects.filter((p) => p.category === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key} className="mb-8">
              <h3 className="mb-3 flex items-baseline gap-3 border-b border-[#c8a869]/20 pb-2 text-sm text-[#e9dcc0]">
                {g.title}<span className="text-[0.65rem] tracking-[0.3em] text-[#c8a869]/70">{g.en.toUpperCase()}</span>
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((p) => {
                  n += 1;
                  return (
                    <li key={p.id}>
                      <button className={`index-item ${current === p.id ? 'is-current' : ''}`} onClick={() => onPick(p.id)}>
                        <span className="font-mono text-xs text-[#c8a869]/80">{String(n).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-[0.95rem] text-[#f3ead6]">{p.title}</span>
                          <span className="block truncate text-xs text-[#f3ead6]/50">{themes[p.theme].label} · {STATUS_LABEL[p.status]}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#c8a869]/70" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
