import { lazy, Suspense, useState } from 'react';
import { Box, MonitorSmartphone, Rotate3d } from 'lucide-react';
import type { Project } from '../data/projects';
import { ACCENT, DEFAULT_BUILDING } from '../three/kinds';
import { Showcase } from './Showcase';

const DioramaView = lazy(() => import('../three/DioramaView'));

/**
 * 介紹頁右側：預設為可 360° 旋轉的 3D 微縮箱庭，可切換到「網站預覽」看實際畫面。
 */
export function MediaPanel({ project, reducedMotion }: { project: Project; reducedMotion: boolean }) {
  const [tab, setTab] = useState<'3d' | 'preview'>('3d');
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  const hasPreview = !!project.showcase;

  return (
    <div className="sc-media reveal">
      <div className="media-panel">
        {hasPreview && (
          <div className="media-tabs" role="tablist" aria-label="作品視覺">
            <button role="tab" aria-selected={tab === '3d'} className={tab === '3d' ? 'is-on' : ''} onClick={() => setTab('3d')}>
              <Box className="h-3.5 w-3.5" aria-hidden /> 3D 箱庭
            </button>
            <button role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'is-on' : ''} onClick={() => setTab('preview')}>
              <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden /> 網站預覽
            </button>
          </div>
        )}
        {tab === '3d' ? (
          <div className="diorama-stage" data-nav-ignore>
            <Suspense fallback={<div className="diorama-loading">建構箱庭中…</div>}>
              <DioramaView kind={kind} accent={accent} reducedMotion={reducedMotion} />
            </Suspense>
            <p className="diorama-hint"><Rotate3d className="h-3.5 w-3.5" aria-hidden /> 拖曳旋轉 · 滾輪縮放</p>
          </div>
        ) : (
          <div className="preview-stage">
            <Showcase project={project} />
          </div>
        )}
      </div>
    </div>
  );
}
