/**
 * 外部 .glb 箱庭（Blender 程序化建模 / AI 生成模型）。
 * - useGLTF 以 meshopt 解壓（解碼器內建在 JS 中，不需外部 CDN）
 * - 每次使用都 clone 一份場景（首頁群島與介紹頁可同時存在）
 * - 依「節點名稱」驅動動畫，建模腳本只要命名就能動：
 *     Gear*        繞自身軸旋轉        ClockHand / ClockHandH  時鐘分針 / 時針
 *     GantryBridge 沿深度方向來回      GantryHead              沿左右方向來回
 *     Drop_N       依序升起、落回格子  Spin* / Bob*            通用旋轉 / 上下浮動
 *     Billboard*   永遠面向鏡頭        Lit_N                   依序點亮（N 由 0 起）
 *     SpinR*       反向旋轉            Pulse*                  呼吸縮放
 *
 * 點擊熱點的專屬動畫（fx）：熱點指定節點名稱與動作（見 FxKind），
 * 動作以「增量」疊加在上述常駐動畫之上（每幀先撤銷上一幀的增量），結束後自動復原；
 * 每個動作都是「結構動作」（掀、滑、伸、拍、轉、顯現、掃描、蓋印），只有指定 glow 的零件才會增亮，
 * 指定 ring 才擴散能量波；FxHide_* 節點平常隱藏，只在 reveal 時出現。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FxKind, FxStep } from '../data/projects';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { modelUrl } from './assets';
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

interface Rig { node: THREE.Object3D; base: THREE.Vector3; kind: string; index: number }

export interface FxTrigger { steps: FxStep[]; key: number; color: string }

// QA：網址加 ?fxslow 會把點擊動畫放慢（預設 12 倍，?fxslow=40 可自訂），方便在慢速的軟體渲染器截圖
const FX_SLOW = typeof location !== 'undefined' ? Number(/fxslow=?(\d*)/.exec(location.search)?.[1] || (location.search.includes('fxslow') ? 12 : 1)) : 1;
const DUR: Record<FxKind, number> = { hinge: 2.6, slide: 2.6, stretch: 2.4, flap: 2.2, whirl: 2.0, reveal: 2.6, sweep: 2.6, stamp: 1.5, press: 0.9, pulse: 1.3, flash: 2.2 };
const AMT: Record<FxKind, number> = { hinge: 1.2, slide: 0.3, stretch: 2, flap: 0.6, whirl: Math.PI * 4, reveal: 1, sweep: 0.5, stamp: 0.2, press: 0.08, pulse: 0.12, flash: 0 };

interface Delta { p: [number, number, number]; r: [number, number, number]; s: [number, number, number]; show: boolean }
const AX = { x: 0, y: 1, z: 2 } as const;
const zero = (): Delta => ({ p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], show: false });
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const bell = (x: number) => Math.sin(clamp01(x) * Math.PI);
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x: number) => { const c = clamp01(x); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
const easeOutBack = (x: number) => { const c = clamp01(x); const k = 1.70158; return 1 + (k + 1) * Math.pow(c - 1, 3) + k * Math.pow(c - 1, 2); };
/** 展開 → 停住 → 收回 的包絡 */
const hold = (u: number, a = 0.22, b = 0.78) => (u < a ? easeInOut(u / a) : u > b ? 1 - easeInOut((u - b) / (1 - b)) : 1);

/** 每種動作在時間 u（0..1）時的增量 */
function delta(s: FxStep, u: number, dur: number): Delta {
  const t = u * dur;
  const d = zero();
  const amt = s.amt ?? AMT[s.kind];
  const i = AX[s.axis ?? (s.kind === 'hinge' || s.kind === 'flap' ? 'x' : 'y')];
  switch (s.kind) {
    case 'hinge': d.r[i] = amt * hold(u); break;
    case 'slide': d.p[i] = amt * hold(u, 0.3, 0.8); break;
    case 'stretch': d.s[i] = 1 + (amt - 1) * hold(u, 0.3, 0.8); break;
    case 'flap': d.r[i] = amt * Math.sin(t * Math.PI * 2 * (s.freq ?? 2.4)) * Math.min(1, u / 0.08) * (u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1); break;
    case 'whirl': d.r[i] = amt * easeInOut(u); break;
    case 'reveal': {
      d.show = true;
      const k = u < 0.2 ? easeOutBack(u / 0.2) : u > 0.85 ? 1 - easeInOut((u - 0.85) / 0.15) : 1;
      d.s = [Math.max(0.02, k * amt), Math.max(0.02, k * amt), Math.max(0.02, k * amt)];
      break;
    }
    case 'sweep': d.p[i] = amt * (0.5 - 0.5 * Math.cos(u * Math.PI * 2 * (s.freq ?? 1))); break;
    case 'stamp':
      // 抬起 → 重重蓋下 → 停留 → 回位
      d.p[1] = u < 0.25 ? easeOut(u / 0.25) * amt * 0.8 : u < 0.33 ? amt * 0.8 - ((u - 0.25) / 0.08) * amt * 1.8 : u < 0.62 ? -amt : -amt + easeInOut((u - 0.62) / 0.38) * amt;
      break;
    case 'press': { const k = bell(Math.min(1, u * 2)); d.p[1] = -amt * k; d.s = [1 + k * 0.06, 1 - k * 0.12, 1 + k * 0.06]; break; }
    case 'pulse': { const b = Math.pow(bell((u * 2) % 1), 3); const k = 1 + amt * b; d.s = [k, k, k]; break; }
    case 'flash': d.show = true; break;
  }
  return d;
}

const ringGeo = new THREE.RingGeometry(0.88, 1, 56).rotateX(-Math.PI / 2);

/** 釋放一個 GLTF 的 GPU 資源（幾何、材質、貼圖）並移出快取 */
function release(url: string, scene: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) textures.add(v); });
      m.dispose();
    });
  });
  textures.forEach((t) => t.dispose());
  useGLTF.clear(modelUrl(url));
}

/**
 * release：離開頁面時釋放資源（介紹頁的精細模型與環境用；首頁輕量版保留快取，返回時秒開）
 */
/**
 * shadows：full＝主模型（投射＋接收，但漂浮/旋轉/看板/發光零件不投射）；
 *          cast＝首頁輕量版（只投射）；none＝3D 環境（大面積地形不進陰影計算）
 */
/**
 * 預熱：先在背景把著色器編譯好（compileAsync，用目標場景的燈光與霧，不阻塞畫面），
 * 再把貼圖每幀上傳 3 張到 GPU；全部完成才把模型放進場景並淡入，避免「出現瞬間」卡頓。
 */
async function warmUp(gl: THREE.WebGLRenderer, obj: THREE.Object3D, camera: THREE.Camera, target: THREE.Scene) {
  try { await gl.compileAsync(obj, camera, target); } catch { /* 舊瀏覽器：退回首幀同步編譯 */ }
  const textures = new Set<THREE.Texture>();
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m) return;
    [m.map, m.emissiveMap, m.normalMap, m.roughnessMap, m.metalnessMap, m.alphaMap].forEach((t) => t && textures.add(t));
  });
  const list = [...textures];
  for (let i = 0; i < list.length; i += 3) {
    list.slice(i, i + 3).forEach((t) => gl.initTexture(t));
    await new Promise((r) => requestAnimationFrame(r));
  }
}

const easeOutBackSoft = (x: number) => { const c = Math.min(1, Math.max(0, x)); const k = 1.2; return 1 + (k + 1) * Math.pow(c - 1, 3) + k * Math.pow(c - 1, 2); };

export default function ModelDiorama({ url, release: shouldRelease = false, fx = null, shadows = 'full', onReady }: {
  url: string; release?: boolean; fx?: FxTrigger | null; shadows?: 'full' | 'cast' | 'none';
  /** 著色器與貼圖都準備好、開始淡入時呼叫（介紹頁用來收起載入遮罩） */
  onReady?: () => void;
}) {
  const gltf = useGLTF(modelUrl(url), false, true);
  useEffect(() => {
    if (!shouldRelease) return;
    const src = gltf.scene;
    return () => { release(url, src); };
  }, [gltf.scene, url, shouldRelease]);
  const { scene, rigs, named, rings, hidden } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const rigs: Rig[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const glowing = mat.emissive && mat.emissive.getHex() !== 0;
        // 角色插畫看板（card_*）：以 alphaTest 裁切透明背景，清晰且不需排序
        const card = mat.name.startsWith('card_');
        if (card) {
          mat.transparent = false;
          mat.alphaTest = 0.5;
          mat.depthWrite = true;
          mat.side = THREE.DoubleSide;
        }
        // 掛在動態節點（Bob/Spin/Billboard/Pulse/Fx…）下的小零件不投射陰影：省下陰影貼圖的重繪
        let moving = false;
        for (let p: THREE.Object3D | null = mesh.parent; p; p = p.parent) if (/^(Bob|Spin|Billboard|Pulse|Lit_|Drop_|FxHide)/.test(p.name)) { moving = true; break; }
        mesh.castShadow = shadows !== 'none' && !mat.transparent && !glowing && !card && !moving;
        mesh.receiveShadow = shadows === 'full' && !glowing && !card;
        if (mat.transparent) mat.depthWrite = false;
      }
      const m = /^(Gear|ClockHandH|ClockHand|GantryBridge|GantryHead|Drop_|SpinR|Spin|Bob|Crane|Hook|Billboard|Lit_|Pulse)(\d*)/.exec(o.name);
      if (m) rigs.push({ node: o, base: o.position.clone(), kind: m[1], index: Number(m[2] || 0) });
    });
    const named = new Map<string, THREE.Object3D[]>();
    root.traverse((o) => {
      if (!o.name) return;
      const list = named.get(o.name) ?? [];
      list.push(o);
      named.set(o.name, list);
    });
    // 光波環（3 個輪流使用）
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
      m.visible = false;
      m.renderOrder = 3;
      root.add(m);
      return m;
    });
    const hidden: THREE.Object3D[] = [];
    root.traverse((o) => { if (o.name.startsWith('FxHide')) { o.visible = false; hidden.push(o); } });
    return { scene: root, rigs, named, rings, hidden };
  }, [gltf.scene, shadows]);

  // ── 預熱與進場動畫 ──
  const { gl, camera, scene: stageScene } = useThree();
  const [ready, setReady] = useState(false);
  const revealRef = useRef<THREE.Group>(null);
  const revealT = useRef(-1);
  const readyCb = useRef(onReady);
  readyCb.current = onReady;
  useEffect(() => {
    let alive = true;
    setReady(false);
    warmUp(gl, scene, camera, stageScene).then(() => {
      if (!alive) return;
      revealT.current = -1;
      setReady(true);
      readyCb.current?.();
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  /** 依名稱找節點（支援結尾 * 萬用字元，例如 Lit_*） */
  const find = (name: string) => {
    if (!name.endsWith('*')) return named.get(name) ?? [];
    const pre = name.slice(0, -1);
    const out: THREE.Object3D[] = [];
    named.forEach((v, k) => { if (k.startsWith(pre)) out.push(...v); });
    return out;
  };

  // ── 點擊動畫狀態 ──
  const active = useRef<{ steps: FxStep[]; start: number; color: THREE.Color } | null>(null);
  const applied = useRef(new Map<THREE.Object3D, Delta>());
  const glowMats = useRef(new Map<THREE.MeshStandardMaterial, { e: THREE.Color; i: number }>());
  const ringState = useRef<{ start: number; pos: THREE.Vector3; scale: number }[]>([]);
  const pendingKey = useRef<number | null>(null);
  useEffect(() => { if (fx) pendingKey.current = fx.key; }, [fx]);
  useEffect(() => () => { glowMats.current.forEach((_, m) => m.dispose()); }, []);

  const glowTargets = (node: THREE.Object3D) => {
    const out: THREE.MeshStandardMaterial[] = [];
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (rings as THREE.Mesh[]).includes(mesh)) return;
      let m = mesh.material as THREE.MeshStandardMaterial;
      if (!glowMats.current.has(m)) {
        if (!m.userData.fxClone) {
          m = m.clone();
          m.userData.fxClone = true;
          mesh.material = m;
        }
        glowMats.current.set(m, { e: m.emissive.clone(), i: m.emissiveIntensity });
      }
      out.push(m);
    });
    return out;
  };

  const emitRing = (node: THREE.Object3D, t: number, scale: number) => {
    const slot = ringState.current.length % rings.length;
    const pos = node.getWorldPosition(new THREE.Vector3());
    scene.worldToLocal(pos);
    ringState.current[slot] = { start: t, pos, scale };
    ringState.current.length = Math.max(ringState.current.length, slot + 1);
  };

  const litCount = useMemo(() => rigs.filter((r) => r.kind === 'Lit_').length, [rigs]);
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    // 進場：0.9 秒由小到大（略帶回彈）並從下方浮上來
    const rg = revealRef.current;
    if (rg && revealT.current < 1) {
      if (revealT.current < 0) revealT.current = 0;
      revealT.current = Math.min(1, revealT.current + dt / 0.9);
      const k = easeOutBackSoft(revealT.current);
      rg.scale.setScalar(Math.max(0.001, 0.86 + 0.14 * k) * (revealT.current < 0.02 ? 0.001 : 1));
      rg.position.y = (1 - Math.min(1, k)) * -0.35;
    }
    // 1) 撤銷上一幀的動畫增量
    applied.current.forEach((d, n) => {
      n.position.x -= d.p[0]; n.position.y -= d.p[1]; n.position.z -= d.p[2];
      n.rotation.x -= d.r[0]; n.rotation.y -= d.r[1]; n.rotation.z -= d.r[2];
      n.scale.x /= d.s[0]; n.scale.y /= d.s[1]; n.scale.z /= d.s[2];
    });
    applied.current.clear();
    // 隱藏零件（FxHide_*）平常不顯示，只有 reveal 動作期間出現
    hidden.forEach((n) => { n.visible = false; });
    // 2) 新的觸發
    if (pendingKey.current !== null && fx) {
      pendingKey.current = null;
      active.current = { steps: fx.steps, start: t, color: new THREE.Color(fx.color.startsWith('#') ? fx.color : '#ffe08a').lerp(new THREE.Color('#ffffff'), 0.35) };
      ringState.current = [];
      // QA 用：記錄最近一次觸發找到的節點數（tools/qa/fx.cjs 會讀取）
      (window as unknown as { __fxLast?: unknown; __fxFind?: unknown }).__fxFind = find;
      (window as unknown as { __fxLast?: unknown }).__fxLast = { key: fx.key, found: fx.steps.map((s) => `${s.node}:${find(s.node).length}`) };
      fx.steps.forEach((s) => find(s.node).forEach((n) => {
        if (s.kind !== 'stamp' && s.ring) emitRing(n, t + (s.delay ?? 0) * FX_SLOW + (s.dur ?? DUR[s.kind]) * 0.15 * FX_SLOW, s.ring);
      }));
    }
    for (const r of rigs) {
      const n = r.node;
      switch (r.kind) {
        case 'Gear': n.rotation.z += dt * (r.node.name.endsWith('B') ? -1.6 : 1) * 0.9; break;
        case 'ClockHand': n.rotation.z -= dt * 0.8; break;
        case 'ClockHandH': n.rotation.z -= dt * 0.07; break;
        case 'GantryBridge': n.position.z = r.base.z + Math.sin(t * 0.45) * 1.1; break;
        case 'GantryHead': n.position.x = r.base.x + Math.sin(t * 0.7 + 1) * 1.15; break;
        case 'Drop_': {
          // 每塊積木輪流：懸空 → 落入格子 → 停留 → 再被提起（求解中）
          const phase = ((t * 0.35 + r.index * 0.25) % 1 + 1) % 1;
          const k = phase < 0.45 ? 1 : phase < 0.6 ? 1 - (phase - 0.45) / 0.15 : phase < 0.9 ? 0 : (phase - 0.9) / 0.1;
          const ease = k * k * (3 - 2 * k);
          n.position.y = r.base.y - 0.54 * (1 - ease) + Math.sin(t * 2 + r.index) * 0.03 * ease;
          break;
        }
        case 'Spin': case 'Crane': n.rotation.y += dt * (0.12 + (r.index % 3) * 0.1); break;
        case 'SpinR': n.rotation.y -= dt * (0.18 + (r.index % 3) * 0.08); break;
        case 'Bob': case 'Hook': n.position.y = r.base.y + Math.sin(t * 0.9 + r.index * 1.3) * 0.1; break;
        case 'Pulse': n.scale.setScalar(1 + Math.sin(t * 1.6 + r.index) * 0.06); break;
        case 'Billboard': {
          // 只繞垂直軸轉向鏡頭（保持直立）
          n.parent?.updateWorldMatrix(true, false);
          const wp = n.getWorldPosition(tmpV);
          const yaw = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
          const parentYaw = n.parent ? new THREE.Euler().setFromQuaternion(n.parent.getWorldQuaternion(tmpQ), 'YXZ').y : 0;
          n.rotation.set(0, yaw - parentYaw, 0);
          break;
        }
        case 'Lit_': {
          // 依序點亮，全亮後重來（例如：被借用的教室、15 天的觀察期）
          const step = Math.floor(t * 1.4) % (litCount + 3);
          n.visible = r.index < step;
          break;
        }
      }
    }
    // 3) 套用點擊動畫增量、發光
    const a = active.current;
    const glowing = new Set<THREE.MeshStandardMaterial>();
    if (a) {
      let alive = false;
      for (const s of a.steps) {
        const dur = (s.dur ?? DUR[s.kind]) * FX_SLOW;
        const u = (t - a.start - (s.delay ?? 0) * FX_SLOW) / dur;
        if (u < 0) { alive = true; continue; }
        if (u > 1) continue;
        alive = true;
        const d = delta(s, u, dur);
        const nodes = find(s.node);
        nodes.forEach((n) => {
          n.position.x += d.p[0]; n.position.y += d.p[1]; n.position.z += d.p[2];
          n.rotation.x += d.r[0]; n.rotation.y += d.r[1]; n.rotation.z += d.r[2];
          n.scale.x *= d.s[0]; n.scale.y *= d.s[1]; n.scale.z *= d.s[2];
          if (d.show) n.visible = true;
          const prev = applied.current.get(n);
          applied.current.set(n, prev ? {
            p: [prev.p[0] + d.p[0], prev.p[1] + d.p[1], prev.p[2] + d.p[2]],
            r: [prev.r[0] + d.r[0], prev.r[1] + d.r[1], prev.r[2] + d.r[2]],
            s: [prev.s[0] * d.s[0], prev.s[1] * d.s[1], prev.s[2] * d.s[2]],
            show: prev.show || d.show,
          } : d);
          // 只有標記 glow 的零件（符文、霓虹、全息）會增亮
          if (s.glow) {
            const k = hold(u, 0.15, 0.75);
            glowTargets(n).forEach((m) => {
              glowing.add(m);
              m.emissive.copy(a.color);
              m.emissiveIntensity = Math.max(glowMats.current.get(m)!.i, k * 1.4);
            });
          }
        });
        // 蓋章：落下瞬間激起光波
        if (s.kind === 'stamp' && s.ring && u > 0.33 && !s._rung) {
          nodes.forEach((n) => emitRing(n, t, s.ring!));
          (s as FxStep & { _rung?: boolean })._rung = true;
        }
      }
      if (!alive) {
        a.steps.forEach((s) => { delete (s as FxStep & { _rung?: boolean })._rung; });
        active.current = null;
      }
    }
    glowMats.current.forEach((orig, m) => {
      if (glowing.has(m)) return;
      m.emissive.copy(orig.e);
      m.emissiveIntensity = orig.i;
    });
    // 4) 光波環
    rings.forEach((ring, i) => {
      const st = ringState.current[i];
      const mat = ring.material as THREE.MeshBasicMaterial;
      if (!st || t < st.start || t - st.start > 1.1 * FX_SLOW) { ring.visible = false; return; }
      const u = (t - st.start) / (1.1 * FX_SLOW);
      ring.visible = true;
      ring.position.copy(st.pos);
      ring.scale.setScalar(0.2 + easeOut(u) * st.scale);
      mat.color.copy(a?.color ?? mat.color);
      mat.opacity = (1 - u) * 0.9;
    });
  });

  return ready ? <group ref={revealRef} scale={0.001}><primitive object={scene} /></group> : null;
}
