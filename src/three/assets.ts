/** 模型路徑與預載（只會被 3D 相關的延遲載入區塊引用，不進主程式包） */
import { useGLTF } from '@react-three/drei';

export const modelUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
/** 自架的 Draco 解碼器（three 官方 wasm 版，於背景 worker 解碼，不依賴外部 CDN） */
export const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`;
export const mapModel = (model: string) => model.replace(/^models\//, 'models/map/');

/** 在背景預先下載並解析模型（不會上傳到 GPU；真正顯示時才建立 GPU 資源） */
export function preloadModels(...paths: (string | undefined)[]) {
  paths.forEach((p) => { if (p) useGLTF.preload(modelUrl(p), DRACO_PATH, true); });
}

/**
 * 把已建立的著色器程式「連結完成」：沒有平行編譯擴充的裝置上，compileAsync 會立刻結束，
 * 真正的連結等待會拖到第一次繪製（造成畫面一頓）。在載入遮罩後面或空檔先呼叫一次 getUniforms，把等待提前做完。
 */
export function finishPrograms(gl: { info: { programs: { getUniforms: () => unknown }[] | null } }) {
  gl.info.programs?.forEach((p) => { try { p.getUniforms(); } catch { /* 忽略 */ } });
}
