import { lazy, Suspense, type MutableRefObject } from 'react';
import { visibleProjects, type Project } from '../data/projects';
import { ACCENT, DEFAULT_BUILDING } from '../three/kinds';
import { CanvasBoundary } from './CanvasBoundary';
import type { CardRefs } from '../three/Hotspots';

const DomainStage = lazy(() => import('../three/DomainStage'));

/** 本頁就緒後在背景預載：前後兩個作品的精細模型與 3D 環境 */
function neighbors(id: string) {
  const i = visibleProjects.findIndex((p) => p.id === id);
  return [visibleProjects[i + 1], visibleProjects[i - 1]].flatMap((p) => (p ? [p.model, p.env] : [])).filter((x): x is string => !!x);
}

/** 全螢幕 3D 舞台：鋪滿整個視窗，位於導覽介面之下 */
export function ProjectStage({ project, reducedMotion, active, onPick, markers, cardRefs, pulse, onReady }: {
  project: Project; reducedMotion: boolean; active: number | null; onPick: (i: number | null) => void; markers: MutableRefObject<(HTMLElement | null)[]>;
  cardRefs: MutableRefObject<CardRefs>; pulse: number; onReady?: () => void;
}) {
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  return (
    <div className="scene-stage" data-nav-ignore>
      <CanvasBoundary>
        <Suspense fallback={<div className="stage-loader" role="status"><div className="stage-loader-box"><span className="stage-loader-label">載入島嶼</span><span className="stage-loader-bar"><i style={{ transform: 'scaleX(0.04)' }} /></span></div></div>}>
          <DomainStage
            kind={kind} accent={accent} model={project.model} env={project.env} projectId={project.id} reducedMotion={reducedMotion}
            hotspots={project.hotspots} active={active} onPick={onPick} markers={markers} cardRefs={cardRefs} pulse={pulse}
            preload={neighbors(project.id)} onReady={onReady}
          />
        </Suspense>
      </CanvasBoundary>
    </div>
  );
}
