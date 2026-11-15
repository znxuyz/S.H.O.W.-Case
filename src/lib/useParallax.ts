import { useEffect, useRef } from 'react';

/**
 * 多圖層滑鼠視差：容器內帶有 data-depth="N" 的圖層，會隨滑鼠位移 ±N px。
 * 以 requestAnimationFrame 直接寫入 transform（不經過 React），收斂後停止迴圈。
 */
export function useParallax<T extends HTMLElement>(active: boolean, reducedMotion: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !active || reducedMotion) return;
    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({ el, d: Number(el.dataset.depth) || 0 }));
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const { el, d } of layers) el.style.transform = `translate3d(${(-cx * d).toFixed(2)}px, ${(-cy * d * 0.6).toFixed(2)}px, 0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [active, reducedMotion]);
  return ref;
}
