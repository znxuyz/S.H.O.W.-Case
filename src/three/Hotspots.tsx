/**
 * 介紹頁的空間導覽：
 * - MarkerProjector：把熱點的 3D 位置投影到螢幕，驅動頁面上的發光標記按鈕
 * - CameraFocus：鏡頭平滑飛到熱點的聚焦位置；取消聚焦時回到全景
 * - StageShift：依視窗比例與是否聚焦，平滑調整主體在畫面上的位置（不被文字卡片遮住）
 */
import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Hotspot } from '../data/projects';

type V3 = [number, number, number];

/** 熱點未指定鏡頭位置時：從場景中心朝熱點方向退後、抬高 */
export function focusCamera(h: Hotspot): V3 {
  if (h.cam) return h.cam;
  const [x, y, z] = h.at;
  // 以「觀眾所在的正面方向」為主、熱點的徑向方向為輔，避免鏡頭繞到建築背面
  const radial = new THREE.Vector3(x, 0, z);
  if (radial.lengthSq() > 1e-4) radial.normalize();
  const dir = new THREE.Vector3(1, 0, 1).normalize().multiplyScalar(0.75).add(radial.multiplyScalar(0.35)).normalize();
  return [x + dir.x * 4.4, y + 2.4, z + dir.z * 4.4];
}

/**
 * 熱點標記投影：標記本身是頁面上的一般 DOM 按鈕（在 ProjectScene 渲染），
 * 這裡每幀把 3D 位置投影成螢幕座標並直接寫入 transform（不經過 React、不建立 portal）。
 */
export interface CardRefs { card: HTMLElement | null; line: HTMLElement | null }

export function MarkerProjector({ hotspots, markers, active = null, cardRefs, occluders }: {
  hotspots: Hotspot[]; markers: MutableRefObject<(HTMLElement | null)[]>; active?: number | null; cardRefs?: MutableRefObject<CardRefs>;
  /** 只對主模型做遮擋射線（不含大面積的 3D 環境地形） */
  occluders?: MutableRefObject<THREE.Object3D | null>;
}) {
  const { camera, size, scene } = useThree();
  const v = useRef(new THREE.Vector3());
  const tmp = useRef({ p: new THREE.Vector3(), d: new THREE.Vector3() });
  const frame = useRef(0);
  const caster = useRef(new THREE.Raycaster());
  // 效能：快取每個元素上次寫入的樣式字串（沒變就不寫，避免無謂的樣式重算）、標籤寬度、說明卡尺寸
  const last = useRef(new Map<HTMLElement, string>());
  const widths = useRef(new Map<HTMLElement, number>());
  const card = useRef<{ el: HTMLElement | null; w: number; h: number; age: number }>({ el: null, w: 0, h: 0, age: 0 });
  const pos = useRef<{ x: number; y: number; vis: boolean }[]>([]);
  const write = (el: HTMLElement, key: string, apply: () => void) => {
    if (last.current.get(el) === key) return;
    last.current.set(el, key);
    apply();
  };
  useFrame(() => {
    const n = hotspots.length;
    // 遮擋檢查：每 4 幀只檢查 1 個熱點（輪流），只對主模型射線
    if (n && ++frame.current % 4 === 0) {
      const i = (frame.current / 4) % n;
      const el = markers.current[i];
      const target = occluders?.current ?? scene;
      if (el) {
        const { p, d } = tmp.current;
        p.set(...hotspots[i].at);
        d.copy(p).sub(camera.position);
        const dist = d.length();
        caster.current.set(camera.position, d.normalize());
        caster.current.far = dist - 0.25;
        const hit = caster.current.intersectObject(target, true).some((x) => (x.object as THREE.Mesh).isMesh && x.object.visible && x.distance > 0.5);
        el.classList.toggle('is-occluded', hit);
      }
    }
    for (let i = 0; i < n; i++) {
      const h = hotspots[i];
      const el = markers.current[i];
      v.current.set(h.at[0], h.at[1], h.at[2]).project(camera);
      const vis = v.current.z < 1 && Math.abs(v.current.x) < 1.15 && Math.abs(v.current.y) < 1.15;
      const px = Math.round((v.current.x * 0.5 + 0.5) * size.width * 2) / 2;
      const py = Math.round((-v.current.y * 0.5 + 0.5) * size.height * 2) / 2;
      pos.current[i] = { x: px, y: py, vis };
      if (!el) continue;
      const key = vis ? `${px},${py}` : 'h';
      write(el, key, () => {
        el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        el.style.visibility = vis ? 'visible' : 'hidden';
      });
    }
    // 說明卡：貼在該物件旁（優先放右側，靠近邊緣就換到左側），並以指引線連回物件
    const c = cardRefs?.current.card;
    if (active !== null && c && size.width > 760 && pos.current[active]) {
      const cc = card.current;
      // 尺寸只在卡片換了或每 30 幀量一次（量測會觸發版面計算）
      if (cc.el !== c || ++cc.age > 30) { cc.el = c; cc.w = c.offsetWidth; cc.h = c.offsetHeight; cc.age = 0; }
      const { x: px, y: py, vis } = pos.current[active];
      const gap = 56;
      const right = px + gap + cc.w < size.width - 76;
      let x = right ? px + gap : px - gap - cc.w;
      x = Math.round(Math.max(16, Math.min(size.width - cc.w - 76, x)));
      const y = Math.round(Math.max(76, Math.min(size.height - cc.h - 92, py - cc.h * 0.4)));
      write(c, `${x},${y}`, () => { c.style.transform = `translate3d(${x}px, ${y}px, 0)`; c.style.visibility = 'visible'; });
      const line = cardRefs!.current.line;
      if (line) {
        const ex = right ? x : x + cc.w;
        const ey = Math.max(y + 18, Math.min(y + cc.h - 18, py));
        const len = Math.max(0, Math.hypot(ex - px, ey - py) - 14);
        const ang = Math.atan2(ey - py, ex - px);
        write(line, `${px},${py},${ex},${ey},${vis}`, () => {
          line.style.width = `${len.toFixed(1)}px`;
          line.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${ang.toFixed(4)}rad) translateX(14px)`;
          line.style.visibility = vis ? 'visible' : 'hidden';
        });
      }
    }
    // 名稱標籤避讓：先把所有圓點當障礙物，再由畫面上方往下排；與已放好的標籤重疊就往上疊一層
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < n; i++) if (pos.current[i]?.vis) placed.push({ x: pos.current[i].x, y: pos.current[i].y, w: 30, h: 30 });
    const order = Array.from({ length: n }, (_, i) => i).filter((i) => pos.current[i]?.vis).sort((a, b) => pos.current[a].y - pos.current[b].y);
    for (const i of order) {
      const el = markers.current[i] as (HTMLElement & { _lab?: HTMLElement | null }) | null;
      if (!el) continue;
      if (el._lab === undefined) el._lab = el.querySelector<HTMLElement>('.hs-label');
      const lab = el._lab;
      if (!lab) continue;
      let w = widths.current.get(lab);
      if (w === undefined) { w = lab.offsetWidth || 90; widths.current.set(lab, w); }
      const { x, y } = pos.current[i];
      let off = 0;
      const hit = (ly: number) => placed.some((q) => Math.abs(q.x - x) < (q.w + w!) / 2 + 4 && Math.abs(q.y - ly) < (q.h + 22) / 2 + 2);
      for (let guard = 0; guard < 6 && hit(y - 33 - off); guard++) off += 26;
      placed.push({ x, y: y - 33 - off, w, h: 22 });
      write(lab, String(off), () => { lab.style.translate = off ? `0 ${-off}px` : ''; });
    }
  });
  return null;
}

export function CameraFocus({ hotspot, home, homeTarget }: { hotspot: Hotspot | null; home: V3; homeTarget: V3 }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);

  useEffect(() => {
    if (hotspot) goal.current = { pos: new THREE.Vector3(...focusCamera(hotspot)), target: new THREE.Vector3(...hotspot.at), t: 0 };
    else if (goal.current || controls) goal.current = { pos: new THREE.Vector3(...home), target: new THREE.Vector3(...homeTarget), t: 0 };
    // 第一次掛載時不要強制拉回（保留預設鏡頭）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspot]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    g.t += dt;
    const k = 1 - Math.pow(0.02, dt);
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (g.t > 1.6 || (camera.position.distanceTo(g.pos) < 0.02 && controls.target.distanceTo(g.target) < 0.02)) goal.current = null;
  });
  return null;
}

/** 主體在畫面上的水平/垂直偏移（以 setViewOffset 實作），平滑過渡 */
export function StageShift({ focused }: { focused: boolean }) {
  const { camera, size } = useThree();
  const cur = useRef<[number, number] | null>(null);
  const settled = useRef(false);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1.05 && size.width >= 1024;
    // 全景：主體略偏右（左上角留給標題）；聚焦：主體偏左（右側留給說明卡）
    const tx = wide ? (focused ? 0.02 : -0.08) : 0;
    const ty = wide ? 0 : focused ? 0.16 : -0.06;
    if (!cur.current) cur.current = [tx, ty];
    const c = cur.current;
    const done = Math.abs(c[0] - tx) < 1e-4 && Math.abs(c[1] - ty) < 1e-4;
    if (done && settled.current && cam.view?.fullWidth === size.width) return;
    settled.current = done;
    c[0] += (tx - c[0]) * 0.08;
    c[1] += (ty - c[1]) * 0.08;
    cam.setViewOffset(size.width, size.height, c[0] * size.width, c[1] * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
  });
  useEffect(() => () => { (camera as THREE.PerspectiveCamera).clearViewOffset(); }, [camera]);
  return null;
}
