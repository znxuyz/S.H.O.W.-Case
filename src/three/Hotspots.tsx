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

export function MarkerProjector({ hotspots, markers, active = null, cardRefs }: {
  hotspots: Hotspot[]; markers: MutableRefObject<(HTMLElement | null)[]>; active?: number | null; cardRefs?: MutableRefObject<CardRefs>;
}) {
  const { camera, size, scene } = useThree();
  const v = useRef(new THREE.Vector3());
  const frame = useRef(0);
  const caster = useRef(new THREE.Raycaster());
  const liftRef = useRef(new Map<number, number>());
  useFrame(() => {
    // 每 12 幀做一次遮擋檢查：被模型擋住的標記淡化
    if (++frame.current % 12 === 0) {
      hotspots.forEach((h, i) => {
        const el = markers.current[i];
        if (!el) return;
        const p = new THREE.Vector3(...h.at);
        const dir = p.clone().sub(camera.position);
        const dist = dir.length();
        caster.current.set(camera.position, dir.normalize());
        caster.current.far = dist - 0.25;
        const hit = caster.current.intersectObjects(scene.children, true).some((x) => (x.object as THREE.Mesh).isMesh && x.object.visible && !(x.object as THREE.Mesh).geometry?.type?.includes('Sphere') && x.distance < dist - 0.25 && x.distance > 0.5);
        el.classList.toggle('is-occluded', hit);
      });
    }
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const order = hotspots.map((h, i) => { v.current.set(h.at[0], h.at[1], h.at[2]).project(camera); return { i, y: v.current.y }; }).sort((a, b) => b.y - a.y);
    hotspots.forEach((h, i) => {
      const el = markers.current[i];
      if (!el) return;
      v.current.set(h.at[0], h.at[1], h.at[2]).project(camera);
      const visible = v.current.z < 1 && Math.abs(v.current.x) < 1.15 && Math.abs(v.current.y) < 1.15;
      const px = (v.current.x * 0.5 + 0.5) * size.width;
      const py = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      el.style.visibility = visible ? 'visible' : 'hidden';
      (el as HTMLElement & { _p?: [number, number] })._p = [px, py];
      // 說明卡：貼在該物件旁（優先放右側，靠近邊緣就換到左側），並以指引線連回物件
      if (i === active && cardRefs?.current.card && size.width > 760) {
        const card = cardRefs.current.card;
        const w = card.offsetWidth, hh = card.offsetHeight;
        const gap = 56;
        const right = px + gap + w < size.width - 76;
        let x = right ? px + gap : px - gap - w;
        x = Math.max(16, Math.min(size.width - w - 76, x));
        const y = Math.max(76, Math.min(size.height - hh - 92, py - hh * 0.4));
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        card.style.visibility = 'visible';
        const line = cardRefs.current.line;
        if (line) {
          const ex = right ? x : x + w;
          const ey = Math.max(y + 18, Math.min(y + hh - 18, py));
          const len = Math.hypot(ex - px, ey - py);
          line.style.width = `${Math.max(0, len - 14).toFixed(1)}px`;
          line.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${Math.atan2(ey - py, ex - px).toFixed(4)}rad) translateX(14px)`;
          line.style.visibility = visible ? 'visible' : 'hidden';
        }
      }
    });
    // 名稱標籤避讓：由畫面上方往下排，與已放好的標籤重疊就往上疊一層
    // 先把所有圓點當成障礙物，標籤（中心約在圓點上方 33px）不得壓到別的圓點
    markers.current.forEach((m) => {
      const q = (m as (HTMLElement & { _p?: [number, number] }) | null)?._p;
      if (q && m!.style.visibility !== 'hidden') placed.push({ x: q[0], y: q[1], w: 30, h: 30 });
    });
    order.forEach(({ i }) => {
      const el = markers.current[i] as (HTMLElement & { _p?: [number, number]; _lab?: HTMLElement | null }) | null;
      if (!el || !el._p || el.style.visibility === 'hidden') return;
      if (el._lab === undefined) el._lab = el.querySelector<HTMLElement>('.hs-label');
      const lab = el._lab;
      if (!lab) return;
      const w = lab.offsetWidth || 90;
      const [x, y] = el._p;
      let off = 0;
      const hit = (ly: number) => placed.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 4 && Math.abs(q.y - ly) < (q.h + 22) / 2 + 2);
      for (let guard = 0; guard < 6 && hit(y - 33 - off); guard++) off += 26;
      placed.push({ x, y: y - 33 - off, w, h: 22 });
      const lift = liftRef.current;
      if (lift.get(i) !== off) { lift.set(i, off); lab.style.translate = off ? `0 ${-off}px` : ''; }
    });
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
