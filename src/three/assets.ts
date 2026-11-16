/** 模型路徑與預載（只會被 3D 相關的延遲載入區塊引用，不進主程式包） */
import { useGLTF } from '@react-three/drei';

export const modelUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const mapModel = (model: string) => model.replace(/^models\//, 'models/map/');

/** 在背景預先下載並解析模型（不會上傳到 GPU；真正顯示時才建立 GPU 資源） */
export function preloadModels(...paths: (string | undefined)[]) {
  paths.forEach((p) => { if (p) useGLTF.preload(modelUrl(p), false, true); });
}
