import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight, Hammer, Wrench, Archive } from 'lucide-react';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { playSceneIntro } from '../lib/titleFx';
import { MediaPanel, ProjectStage } from './MediaPanel';
import { GitHubIcon } from './icons';

const STATUS = {
  live: { label: '上線中', icon: null },
  dev: { label: '開發中', icon: Hammer },
  maintenance: { label: '維修中', icon: Wrench },
  archived: { label: '已停用', icon: Archive },
} as const;

/** 依主題附加的裝飾（不影響版面結構） */
function ThemeOrnament({ project }: { project: Project }) {
  switch (project.theme) {
    case 'oriental':
      return (
        <div className="oriental-vertical reveal" aria-hidden>
          <span className="seal">{project.title.slice(0, 2)}</span>
          <span className="vertical-text">{project.tagline}</span>
        </div>
      );
    case 'cyber':
      return <span className="cyber-corners" aria-hidden><i /><i /><i /><i /></span>;
    default:
      return null;
  }
}

export function ProjectScene({ project, index, total, reducedMotion }: { project: Project; index: number; total: number; reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const theme = themes[project.theme];
  const status = STATUS[project.status];

  useLayoutEffect(() => {
    if (!root.current) return;
    return playSceneIntro(root.current, theme.title, reducedMotion);
  }, [theme.title, reducedMotion]);

  const num = String(index).padStart(2, '0');
  const StatusIcon = status.icon;

  return (
    <>
    {/* 全螢幕 3D 舞台（在文字下方） */}
    <ProjectStage project={project} reducedMotion={reducedMotion} />
    <div className="stage-veil" aria-hidden />
    <div ref={root} data-scroll className="scene-scroll scene-over">
      <div className={`scene-grid scene-${project.theme}`}>
        <div className="sc-copy">
          <ThemeOrnament project={project} />
          <div className="sc-kicker reveal">
            <span className="sc-num">{num}<span className="opacity-50"> / {String(total).padStart(2, '0')}</span></span>
            <span className="sc-kicker-sep" />
            <span>{theme.label}</span>
            <span className={`sc-status sc-status-${project.status}`}>
              {StatusIcon ? <StatusIcon className="h-3 w-3" aria-hidden /> : <span className="sc-pulse" aria-hidden />}
              {status.label}
            </span>
          </div>
          {project.code && <p className="sc-code reveal">{project.code}</p>}
          <h2 className="sc-title">{project.title}</h2>
          <p className="sc-tagline reveal">{project.tagline}</p>
          <p className="sc-desc reveal">{project.description}</p>
          <ul className="sc-highlights">
            {project.highlights.map((h) => (
              <li key={h} className="reveal">{h}</li>
            ))}
          </ul>
          <div className="sc-tags reveal">
            {project.tech.map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="sc-actions reveal">
            {project.links.demo ? (
              <a className="sc-btn sc-btn-primary" href={project.links.demo} target="_blank" rel="noopener noreferrer">
                <span>{project.links.demoLabel ?? 'Live Demo'}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <span className="sc-btn sc-btn-disabled" aria-disabled="true">
                <Hammer className="h-4 w-4" aria-hidden /> <span>開發中 · 尚未開放</span>
              </span>
            )}
            <a className="sc-btn sc-btn-secondary" href={project.links.repo} target="_blank" rel="noopener noreferrer">
              <GitHubIcon />
              <span>Source Code</span>
            </a>
          </div>
          {project.note && <p className="sc-note reveal">※ {project.note}</p>}
        </div>
        <MediaPanel project={project} />
      </div>
    </div>
    </>
  );
}
