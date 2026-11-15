import { lazy, Suspense, type MutableRefObject } from 'react';
import type { Project } from '../data/projects';
import { ACCENT, DEFAULT_BUILDING } from '../three/kinds';
import { CanvasBoundary } from './CanvasBoundary';
import type { CardRefs } from '../three/Hotspots';

const DomainStage = lazy(() => import('../three/DomainStage'));

/** 全螢幕 3D 舞台：鋪滿整個視窗，位於導覽介面之下 */
export function ProjectStage({ project, reducedMotion, active, onPick, markers, cardRefs, pulse }: {
  project: Project; reducedMotion: boolean; active: number | null; onPick: (i: number | null) => void; markers: MutableRefObject<(HTMLElement | null)[]>;
  cardRefs: MutableRefObject<CardRefs>; pulse: number;
}) {
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  return (
    <div className="scene-stage" data-nav-ignore>
      <CanvasBoundary>
        <Suspense fallback={<div className="stage-loading">建構箱庭中…</div>}>
          <DomainStage
            kind={kind} accent={accent} model={project.model} env={project.env} projectId={project.id} reducedMotion={reducedMotion}
            hotspots={project.hotspots} active={active} onPick={onPick} markers={markers} cardRefs={cardRefs} pulse={pulse}
          />
        </Suspense>
      </CanvasBoundary>
    </div>
  );
}
