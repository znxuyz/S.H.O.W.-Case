import { useEffect, useRef } from 'react';

export interface LoopFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since start */
  t: number;
  /** seconds since last frame (clamped) */
  dt: number;
}

/**
 * Runs `draw` every animation frame on a DPR-aware canvas.
 * `init` is called on mount and on every resize (good place to (re)seed particles).
 * When inactive or reduced-motion, a single static frame is drawn.
 */
export function useCanvasLoop(
  draw: (f: LoopFrame) => void,
  { active, reducedMotion, init }: { active: boolean; reducedMotion: boolean; init?: (w: number, h: number) => void },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const initRef = useRef(init);
  drawRef.current = draw;
  initRef.current = init;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    const start = last;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initRef.current?.(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      drawRef.current({ ctx, w, h, t: (now - start) / 1000, dt });
      if (active && !reducedMotion && !document.hidden) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (!document.hidden && active && !reducedMotion) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active, reducedMotion]);

  return ref;
}

/** deterministic PRNG so SVG decorations are stable between renders */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
