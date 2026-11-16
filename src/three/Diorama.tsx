/**
 * 島嶼主模型：載入 Blender 匯出的 .glb（介紹頁用精細版、首頁群島用輕量版 models/map/）。
 * 載入期間不顯示任何替代模型（fallback = null）；由 ModelDiorama 預熱完成後淡入，
 * 介紹頁另有 DOM 載入遮罩（StageLoader）顯示進度。
 */
import { lazy, Suspense } from 'react';
import type { FxTrigger } from './ModelDiorama';
import { mapModel } from './assets';

const ModelDiorama = lazy(() => import('./ModelDiorama'));

export function Diorama({ model, lights = false, lod = false, fx = null, onReady }: {
  model: string; lights?: boolean; lod?: boolean; fx?: FxTrigger | null; onReady?: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <ModelDiorama url={lod ? mapModel(model) : model} release={!lod} fx={fx} shadows={lod ? 'cast' : 'full'} onReady={onReady} />
      {lights && (
        <>
          <pointLight color="#9fd8ff" intensity={6} distance={6} position={[0, 1.6, 0.6]} />
          <pointLight color="#ffc24a" intensity={8} distance={4} position={[0, -1.7, 0]} />
        </>
      )}
    </Suspense>
  );
}
