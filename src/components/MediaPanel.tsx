import { lazy, Suspense, useState } from 'react';
import { MonitorSmartphone, Rotate3d, X } from 'lucide-react';
import type { Project } from '../data/projects';
import { ACCENT, DEFAULT_BUILDING } from '../three/kinds';
import { CanvasBoundary } from './CanvasBoundary';
import { Showcase } from './Showcase';

const DomainStage = lazy(() => import('../three/DomainStage'));

/** 全螢幕 3D 舞台：鋪滿整個視窗，位於文字層之下 */
export function ProjectStage({ project, reducedMotion }: { project: Project; reducedMotion: boolean }) {
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  return (
    <div className="scene-stage" data-nav-ignore>
      <CanvasBoundary>
        <Suspense fallback={<div className="stage-loading">建構箱庭中…</div>}>
          <DomainStage kind={kind} accent={accent} reducedMotion={reducedMotion} />
        </Suspense>
      </CanvasBoundary>
    </div>
  );
}

/**
 * 右側留白區：操作提示，以及可展開的「網站預覽」浮動卡片（不遮擋 3D 舞台的其餘部分）。
 */
export function MediaPanel({ project }: { project: Project }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="sc-media">
      <div className="stage-tools reveal">
        <span className="stage-hint"><Rotate3d className="h-3.5 w-3.5" aria-hidden /> 拖曳旋轉 · 滾輪縮放</span>
        {project.showcase && (
          <button className={`stage-btn ${preview ? 'is-on' : ''}`} onClick={() => setPreview((v) => !v)} aria-expanded={preview}>
            {preview ? <X className="h-3.5 w-3.5" aria-hidden /> : <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden />}
            {preview ? '關閉預覽' : '網站預覽'}
          </button>
        )}
      </div>
      {preview && (
        <div className="preview-card">
          <Showcase project={project} />
        </div>
      )}
    </div>
  );
}
