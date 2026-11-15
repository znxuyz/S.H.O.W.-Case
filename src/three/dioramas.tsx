/**
 * 主題微縮箱庭（Diorama）：每座都是 4×4 方形地塊 + 主題建築，
 * 全部以基礎幾何體程序化堆疊而成（零外部模型）。
 * lights=true 時加入窗戶/燈籠的暖色點光源（介紹頁使用）；大地圖上關閉以維持效能。
 */
import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Gable, Hip, P, Plinth, Tree } from './kit';

import type { BuildingKind } from './kinds';

type V3 = [number, number, number];

/* ───────── 小動畫：旋轉、上下浮動 ───────── */
function Spin({ speed = 0.5, axis = 'y', p, children }: { speed?: number; axis?: 'x' | 'y' | 'z'; p?: V3; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation[axis] += dt * speed; });
  return <group ref={ref} position={p}>{children}</group>;
}
function Bob({ amp = 0.12, speed = 1.4, phase = 0, p, children }: { amp?: number; speed?: number; phase?: number; p?: V3; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const base = p?.[1] ?? 0;
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = base + Math.sin(clock.elapsedTime * speed + phase) * amp; });
  return <group ref={ref} position={p}>{children}</group>;
}

/* ───────── 未來科技：霓虹全息高塔 ───────── */
function Tower({ lights }: { lights: boolean }) {
  const bands = (h: number, w: number, from = 0.5, step = 0.32) =>
    Array.from({ length: Math.floor((h - from) / step) }, (_, k) => (
      <P key={k} c={k % 4 === 3 ? '#ff3df2' : '#22e4ff'} e ei={1.8} p={[0, from + k * step, 0]} s={[w + 0.03, 0.05, w + 0.03]} />
    ));
  return (
    <group>
      <Plinth top="#0d2235" soil="#13293b" rock="#0a141e" />
      {[-1.5, -0.75, 0, 0.75, 1.5].map((v) => (
        <group key={v}>
          <P c="#22e4ff" e ei={0.9} p={[v, 0.005, 0]} s={[0.025, 0.01, 4]} />
          <P c="#22e4ff" e ei={0.9} p={[0, 0.005, v]} s={[4, 0.01, 0.025]} />
        </group>
      ))}
      <P g="ring" c="#22e4ff" e p={[0, 0.03, 0]} s={3.2} r={[Math.PI / 2, 0, 0]} />
      <P c="#163049" p={[0, 0.15, 0]} s={[1.9, 0.3, 1.9]} m={0.4} ro={0.4} />
      <group position={[0, 0.3, 0]}>
        <P c="#0f2a40" p={[0, 1.85, 0]} s={[1, 3.7, 1]} m={0.6} ro={0.25} />
        {bands(3.6, 1)}
        <P c="#123a55" p={[0, 3.85, 0]} s={[0.7, 0.3, 0.7]} m={0.5} ro={0.3} />
        <P g="cyl6" c="#9ff7ff" p={[0, 4.5, 0]} s={[0.05, 1.1, 0.05]} />
        <P g="sphere" c="#ff3df2" e ei={2.4} p={[0, 5.1, 0]} s={0.18} />
      </group>
      <group position={[-1.15, 0.3, 0.75]}>
        <P c="#0f2a40" p={[0, 0.8, 0]} s={[0.7, 1.6, 0.7]} m={0.5} ro={0.3} />
        <group>{bands(1.5, 0.7, 0.3, 0.36)}</group>
      </group>
      <group position={[1.05, 0.3, -0.95]}>
        <P c="#0f2a40" p={[0, 1.15, 0]} s={[0.6, 2.3, 0.6]} m={0.5} ro={0.3} />
        <group>{bands(2.2, 0.6, 0.35, 0.4)}</group>
      </group>
      <Spin speed={0.6} p={[0, 2.4, 0]}>
        <P g="torus" c="#22e4ff" e ei={2} s={1.9} r={[Math.PI / 2, 0, 0]} />
      </Spin>
      <Spin speed={-0.9} p={[0, 3.3, 0]}>
        <P g="torus" c="#ff3df2" e ei={2} s={1.4} r={[Math.PI / 2.2, 0, 0]} />
      </Spin>
      {[[1.6, 1.6], [-1.6, -1.5], [1.6, -1.6], [-1.5, 1.6]].map(([x, z]) => (
        <P key={`${x}${z}`} g="cone" c="#22e4ff" e ei={1.2} p={[x, 0.45, z]} s={[0.16, 0.9, 0.16]} />
      ))}
      {lights && (
        <>
          <pointLight color="#22e4ff" intensity={8} distance={7} position={[0.9, 1.2, 1.2]} />
          <pointLight color="#ff3df2" intensity={6} distance={5} position={[0, 4.6, 0.6]} />
        </>
      )}
    </group>
  );
}

/* ───────── 神話神獸：懸浮祭壇與靈晶 ───────── */
function Altar({ lights }: { lights: boolean }) {
  return (
    <group>
      <Plinth top="#3b2163" soil="#2b1748" rock="#1a0d2e" />
      <P g="ring" c="#ffc76b" e p={[0, 0.02, 0]} s={3.5} r={[Math.PI / 2, 0, 0]} />
      <P c="#4b2a6a" p={[0, 0.15, 0]} s={[3, 0.3, 3]} />
      <P c="#5e3786" p={[0, 0.45, 0]} s={[2.2, 0.3, 2.2]} />
      <P c="#6b44a0" p={[0, 0.75, 0]} s={[1.4, 0.3, 1.4]} />
      <P c="#ffc76b" e ei={0.8} p={[0, 0.905, 0]} s={[1.42, 0.02, 1.42]} />
      {[[1.15, 1.15], [-1.15, 1.15], [1.15, -1.15], [-1.15, -1.15]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.3, z]}>
          <P g="cyl6" c="#7a52b0" p={[0, 0.75, 0]} s={[0.24, 1.5, 0.24]} />
          <P c="#ffc76b" e ei={0.7} p={[0, 1.55, 0]} s={[0.34, 0.1, 0.34]} />
          <P g="oct" c="#ffc76b" e ei={1.6} p={[0, 1.75, 0]} s={0.16} />
        </group>
      ))}
      <Bob p={[0, 2.3, 0]} amp={0.16} speed={1.2}>
        <Spin speed={0.8}>
          <P g="oct" c="#7fd8ff" e ei={1.3} s={[0.75, 1.3, 0.75]} />
          <P g="oct" c="#ffffff" e ei={2} s={[0.3, 0.55, 0.3]} />
        </Spin>
      </Bob>
      <Spin speed={0.35} p={[0, 2.3, 0]}>
        <P g="torus" c="#ffc76b" e ei={1.8} s={1.7} r={[Math.PI / 2.6, 0, 0]} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return <P key={i} c="#ffc76b" e ei={1.4} p={[Math.cos(a) * 1.25, Math.sin(a * 2) * 0.2, Math.sin(a) * 1.25]} s={0.13} />;
        })}
      </Spin>
      {[[1.6, -0.4], [-1.65, 0.5], [0.4, 1.7], [-0.6, -1.7]].map(([x, z], i) => (
        <P key={i} g="oct" c={i % 2 ? '#b98cff' : '#7fd8ff'} e ei={0.7} p={[x, 0.3, z]} s={[0.22, 0.6, 0.22]} />
      ))}
      {lights && (
        <>
          <pointLight color="#b98cff" intensity={10} distance={6} position={[0, 2.3, 0]} />
          <pointLight color="#ffc76b" intensity={5} distance={4} position={[0, 1.1, 1.2]} />
        </>
      )}
    </group>
  );
}

/* ───────── 古典中式：月夜飛簷樓閣與石拱橋 ───────── */
function Lantern({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <P g="cyl6" c="#e8c872" p={[0, 0.13, 0]} s={[0.015, 0.18, 0.015]} />
      <P g="sphere" c="#ff5a2e" e ei={2.2} s={[0.16, 0.2, 0.16]} />
    </group>
  );
}
function Pagoda({ lights }: { lights: boolean }) {
  const arch = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { x: 0.25 + t * 1.6, y: 0.08 + Math.sin(t * Math.PI) * 0.42, a: Math.cos(t * Math.PI) * 0.6 };
  });
  const tips = (w: number, y: number) =>
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => (
      <P key={`${sx}${sz}`} g="cone" c="#e8c872" e ei={0.6} p={[sx * w * 0.52, y, sz * w * 0.52]} s={[0.07, 0.3, 0.07]} r={[sz * 0.9, 0, -sx * 0.9]} />
    ));
  return (
    <group>
      <Plinth top="#56664e" soil="#3b3a32" rock="#24221d" />
      <P c="#1b3a40" p={[1.05, 0.01, 0]} s={[1.3, 0.03, 4]} m={0.4} ro={0.15} />
      {arch.map((s, i) => <P key={i} c="#a29e92" p={[s.x, s.y, 0]} s={[0.24, 0.1, 0.62]} r={[0, 0, s.a]} />)}
      <P c="#8d897d" p={[1.05, 0.52, 0.3]} s={[1.5, 0.05, 0.04]} />
      <P c="#8d897d" p={[1.05, 0.52, -0.3]} s={[1.5, 0.05, 0.04]} />
      <group position={[-0.7, 0, 0]}>
        <P c="#3b3128" p={[0, 0.11, 0]} s={[2, 0.22, 2]} />
        <P c="#e8c872" e ei={0.4} p={[0, 0.225, 0]} s={[2.02, 0.01, 2.02]} />
        {[[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]].map(([x, z]) => (
          <P key={`${x}${z}`} g="cyl6" c="#8e2a1c" p={[x, 0.72, z]} s={[0.12, 1, 0.12]} />
        ))}
        <P c="#ffcf7a" e ei={0.5} p={[0, 0.72, 0]} s={[1, 0.8, 1]} op={0.35} />
        <Hip c="#22282a" p={[0, 1.5, 0]} w={2.3} h={0.6} />
        {tips(2.3, 1.3)}
        <P c="#7a2418" p={[0, 2.0, 0]} s={[1.05, 0.5, 1.05]} />
        <P c="#ffcf7a" e ei={1.4} p={[0, 2.0, 0.53]} s={[0.6, 0.22, 0.01]} />
        <P c="#ffcf7a" e ei={1.4} p={[0.53, 2.0, 0]} s={[0.01, 0.22, 0.6]} />
        <Hip c="#22282a" p={[0, 2.5, 0]} w={1.8} h={0.5} />
        {tips(1.8, 2.32)}
        <P c="#7a2418" p={[0, 2.88, 0]} s={[0.6, 0.38, 0.6]} />
        <Hip c="#22282a" p={[0, 3.35, 0]} w={1.15} h={0.62} />
        <P g="cyl6" c="#e8c872" e ei={0.5} p={[0, 3.9, 0]} s={[0.05, 0.6, 0.05]} />
        <P g="sphere" c="#e8c872" e ei={0.8} p={[0, 3.85, 0]} s={0.12} />
        <P g="sphere" c="#e8c872" e ei={0.8} p={[0, 4.05, 0]} s={0.09} />
        <Lantern p={[1.1, 1.0, 1.1]} />
        <Lantern p={[-1.1, 1.0, 1.1]} />
        <Lantern p={[1.1, 1.0, -1.1]} />
        <Lantern p={[0.85, 2.05, 0.85]} />
      </group>
      <Tree p={[-1.55, 0, 1.5]} kind="pine" c="#2f4a36" c2="#22382a" s={0.9} />
      <Tree p={[-1.55, 0, -1.5]} kind="pine" c="#2f4a36" c2="#22382a" s={1.1} />
      <Tree p={[1.6, 0, -1.65]} kind="pine" c="#2f4a36" c2="#22382a" s={0.7} />
      <P g="dodeca" c="#77756c" p={[0.3, 0.12, 1.6]} s={0.35} />
      <P g="dodeca" c="#6a675e" p={[1.7, 0.1, 1.55]} s={0.28} />
      <Bob p={[1.5, 4.3, -1.5]} amp={0.1} speed={0.6}>
        <P g="sphere" c="#ffe9b0" e ei={1.3} s={0.85} />
        <P c="#d8d2c4" p={[-0.2, -0.5, 0.2]} s={[1.3, 0.12, 0.35]} op={0.85} />
      </Bob>
      {lights && (
        <>
          <pointLight color="#ff9a4d" intensity={7} distance={5} position={[-0.7, 1.1, 1.3]} />
          <pointLight color="#ffcf7a" intensity={5} distance={4} position={[-0.7, 2.0, 0.9]} />
          <pointLight color="#ffe9b0" intensity={4} distance={6} position={[1.5, 4.3, -1.5]} />
        </>
      )}
    </group>
  );
}

/* ───────── 守護獸森林：樹屋與靈獸祭壇 ───────── */
function Treehouse({ lights }: { lights: boolean }) {
  return (
    <group>
      <Plinth top="#3f9a5c" soil="#6b4a2f" rock="#3b2a1c" />
      <group position={[-0.45, 0, -0.35]}>
        <P g="cyl6" c="#6b4423" p={[0, 1.3, 0]} s={[0.62, 2.6, 0.62]} />
        {[0, 1.6, 3.2, 4.7].map((a) => (
          <P key={a} g="cone" c="#5a3a1e" p={[Math.cos(a) * 0.4, 0.15, Math.sin(a) * 0.4]} s={[0.25, 0.5, 0.25]} r={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]} />
        ))}
        <P c="#8a5a2e" p={[0, 1.9, 0]} s={[1.9, 0.12, 1.9]} />
        <P c="#d39a5a" p={[0.15, 2.35, 0.1]} s={[1.2, 0.8, 1]} />
        <P c="#ffe7a0" e ei={1.6} p={[0.15, 2.4, 0.61]} s={[0.24, 0.24, 0.02]} />
        <P c="#ffe7a0" e ei={1.6} p={[0.76, 2.4, 0.1]} s={[0.02, 0.24, 0.24]} />
        <Gable c="#d1584f" p={[0.15, 2.95, 0.1]} w={1.4} d={1.15} h={0.45} />
        {[[-0.8, 3.1, -0.6, 1.4, '#1f6b45'], [0.6, 3.3, -0.7, 1.3, '#2f8f5b'], [-0.2, 3.7, -0.2, 1.5, '#3fae6a'], [-0.9, 3.4, 0.5, 1.0, '#2f8f5b'], [0.3, 4.2, -0.5, 1.0, '#5fd08a']].map(([x, y, z, s, c], i) => (
          <P key={i} g="ico" c={c as string} p={[x as number, y as number, z as number]} s={s as number} />
        ))}
      </group>
      <group position={[1.1, 0, 1.05]}>
        <P g="cyl" c="#8f9a8c" p={[0, 0.1, 0]} s={[1.3, 0.2, 1.3]} />
        {[0, 2.1, 4.2].map((a) => <P key={a} c="#a9b3a5" p={[Math.cos(a) * 0.55, 0.45, Math.sin(a) * 0.55]} s={[0.18, 0.55, 0.12]} r={[0, -a, 0]} />)}
        <Bob p={[0, 1.15, 0]} amp={0.12} speed={1.6}>
          <P g="ico1" c="#9effc9" e ei={1.6} s={0.42} />
          <Spin speed={1.2}><P g="torus" c="#9effc9" e ei={1.6} s={0.85} r={[Math.PI / 2.4, 0, 0]} /></Spin>
        </Bob>
      </group>
      {[[1.4, -1.3, '#5ef0ff'], [1.65, -0.9, '#ff8ad8'], [-1.5, 1.45, '#ffd35a']].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0, z as number]}>
          <P g="cyl6" c="#e9f2e6" p={[0, 0.12, 0]} s={[0.07, 0.24, 0.07]} />
          <P g="dome" c={c as string} e ei={0.9} p={[0, 0.22, 0]} s={[0.3, 0.22, 0.3]} />
        </group>
      ))}
      <P g="ico" c="#2f8f5b" p={[1.6, 0.25, 0.1]} s={0.5} />
      <P g="ico" c="#3fae6a" p={[-1.6, 0.25, 0.4]} s={0.45} />
      <Spin speed={0.25} p={[-0.3, 0, -0.2]}>
        {[[1.6, 2.2], [-1.4, 1.6], [0.6, 3.1], [-0.9, 2.7], [1.2, 1.2]].map(([r, y], i) => (
          <P key={i} g="sphere" c="#eaff9a" e ei={2.4} p={[Math.cos(i * 1.3) * r, y, Math.sin(i * 1.3) * r]} s={0.07} />
        ))}
      </Spin>
      {lights && (
        <>
          <pointLight color="#ffcf6a" intensity={6} distance={5} position={[0.2, 2.4, 1.0]} />
          <pointLight color="#9effc9" intensity={7} distance={4.5} position={[1.1, 1.2, 1.05]} />
        </>
      )}
    </group>
  );
}

/* ───────── 校園建築（屋頂與旗幟用作品強調色） ───────── */
const WALL = '#f6f1e7';
const GLASS = '#86acd6';
function CampusBase() {
  return (
    <>
      <Plinth top="#8fc06a" soil="#8b6b4a" rock="#5c4631" />
      <P c="#e9dfca" p={[0, 0.012, 0.95]} s={[3.4, 0.025, 1.5]} />
    </>
  );
}
function Windows({ x0, x1, z, ys, n }: { x0: number; x1: number; z: number; ys: number[]; n: number }) {
  return (
    <>
      {ys.map((y) => Array.from({ length: n }, (_, i) => (
        <P key={`${y}-${i}`} c={GLASS} p={[x0 + ((x1 - x0) / (n - 1)) * i, y, z]} s={[0.22, 0.26, 0.02]} m={0.3} ro={0.3} />
      )))}
    </>
  );
}
function School({ accent }: { accent: string }) {
  return (
    <group>
      <CampusBase />
      <P c={WALL} p={[0, 0.6, -0.6]} s={[3, 1.2, 1.1]} />
      <Windows x0={-1.25} x1={1.25} z={-0.04} ys={[0.4, 0.85]} n={7} />
      <Gable c={accent} p={[0, 1.42, -0.6]} w={3.2} d={1.3} h={0.45} />
      <P c={WALL} p={[0, 1.1, -0.35]} s={[0.7, 2.2, 0.7]} />
      <P g="cyl" c="#ffffff" p={[0, 1.75, 0.01]} s={[0.4, 0.03, 0.4]} r={[Math.PI / 2, 0, 0]} />
      <P c="#1f2430" p={[0, 1.8, 0.03]} s={[0.025, 0.14, 0.01]} />
      <Hip c={accent} p={[0, 2.5, -0.35]} w={0.85} h={0.6} />
      <P c="#6c8fb6" p={[0, 0.3, 0.01]} s={[0.36, 0.6, 0.02]} />
      <P g="cyl6" c="#9aa0aa" p={[1.45, 0.8, 1.2]} s={[0.04, 1.6, 0.04]} />
      <P c={accent} p={[1.66, 1.45, 1.2]} s={[0.4, 0.26, 0.02]} />
      <Tree p={[-1.55, 0, 1.4]} s={0.8} />
      <Tree p={[1.6, 0, -1.55]} s={0.7} />
      <Tree p={[-1.6, 0, -1.55]} s={0.65} c="#7cc36b" c2="#6fb85e" />
    </group>
  );
}
function Hall({ accent }: { accent: string }) {
  return (
    <group>
      <CampusBase />
      <P c="#ddd3bf" p={[0, 0.08, -0.4]} s={[3, 0.16, 2]} />
      <P c={WALL} p={[0, 0.85, -0.6]} s={[2.6, 1.4, 1.3]} />
      <Windows x0={-1.05} x1={1.05} z={0.06} ys={[0.6, 1.05]} n={5} />
      {[-1.05, -0.52, 0, 0.52, 1.05].map((x) => <P key={x} g="cyl" c="#ffffff" p={[x, 0.85, 0.32]} s={[0.15, 1.4, 0.15]} />)}
      <P c={accent} p={[0, 1.62, -0.45]} s={[2.9, 0.14, 1.75]} />
      <Gable c={accent} p={[0, 1.88, 0.15]} w={2.7} d={0.5} h={0.38} />
      <P c={WALL} p={[0, 1.9, -0.9]} s={[0.8, 0.5, 0.6]} />
      <Hip c={accent} p={[0, 2.38, -0.9]} w={0.95} h={0.45} />
      <Tree p={[1.6, 0, 1.45]} s={0.75} />
      <Tree p={[-1.6, 0, 1.45]} s={0.75} />
    </group>
  );
}
function Library({ accent }: { accent: string }) {
  return (
    <group>
      <CampusBase />
      <P c={WALL} p={[0, 0.6, -0.3]} s={[2.2, 1.2, 2.2]} />
      <Windows x0={-0.8} x1={0.8} z={0.81} ys={[0.55]} n={4} />
      <P c="#e2d8c6" p={[0, 1.25, -0.3]} s={[2.4, 0.1, 2.4]} />
      <P g="dome" c={accent} p={[0, 1.3, -0.3]} s={[1.75, 1.3, 1.75]} m={0.2} ro={0.5} />
      <P g="cyl6" c={WALL} p={[0, 2.05, -0.3]} s={[0.25, 0.3, 0.25]} />
      <Hip c={accent} p={[0, 2.32, -0.3]} w={0.3} h={0.25} />
      <P c="#ddd3bf" p={[0, 0.06, 1.0]} s={[1, 0.12, 0.5]} />
      <Tree p={[1.6, 0, 1.5]} s={0.7} />
      <Tree p={[-1.6, 0, 1.5]} s={0.8} c="#7cc36b" c2="#6fb85e" />
      <Tree p={[-1.6, 0, -1.6]} s={0.6} />
    </group>
  );
}
function Kiosk({ accent }: { accent: string }) {
  return (
    <group>
      <CampusBase />
      <P c="#fff7ec" p={[-0.5, 0.5, -0.5]} s={[1.5, 1, 1.3]} />
      <Windows x0={-0.95} x1={-0.05} z={0.16} ys={[0.55]} n={3} />
      <Hip c={accent} p={[-0.5, 1.35, -0.5]} w={1.75} h={0.7} />
      <P c={accent} p={[-0.5, 0.95, 0.3]} s={[1.4, 0.06, 0.35]} r={[0.35, 0, 0]} />
      <P g="cyl6" c="#9aa0aa" p={[1.1, 0.9, 0.6]} s={[0.05, 1.8, 0.05]} />
      <Spin speed={0.5} p={[1.1, 2.1, 0.6]}>
        <P g="ico1" c="#9ad6ff" s={0.75} />
        <P g="ico1" c={accent} s={[0.77, 0.3, 0.77]} />
      </Spin>
      <P g="torus" c={accent} p={[1.1, 2.1, 0.6]} s={1.0} r={[0.4, 0, 0.4]} />
      <Tree p={[1.55, 0, -1.5]} s={0.75} />
      <Tree p={[-1.6, 0, 1.45]} s={0.65} />
    </group>
  );
}

/* ───────── 工程藍圖：施工中建築與塔吊 ───────── */
function Workshop({ lights }: { lights: boolean }) {
  return (
    <group>
      <Plinth top="#164a86" soil="#123c72" rock="#0a2244" />
      {[-1.5, -0.75, 0, 0.75, 1.5].map((v) => (
        <group key={v}>
          <P c="#cfe3ff" e ei={0.35} p={[v, 0.005, 0]} s={[0.02, 0.01, 4]} />
          <P c="#cfe3ff" e ei={0.35} p={[0, 0.005, v]} s={[4, 0.01, 0.02]} />
        </group>
      ))}
      <P c="#1a4f8f" p={[-0.3, 0.1, -0.1]} s={[2.4, 0.2, 2]} />
      <P c="#2a63a8" p={[-0.3, 0.6, -0.1]} s={[2.2, 0.8, 1.8]} />
      <P c="#cfe3ff" p={[-0.3, 1.6, -0.1]} s={[2.2, 1.2, 1.8]} wire />
      <P c="#cfe3ff" p={[-0.3, 1.0, -0.1]} s={[2.24, 0.04, 1.84]} op={0.5} />
      {[[-1.4, 0.8], [0.8, 0.8], [-1.4, -1.0], [0.8, -1.0]].map(([x, z]) => <P key={`${x}${z}`} g="cyl6" c="#ffd166" p={[x, 1.1, z]} s={[0.04, 2.2, 0.04]} />)}
      <Spin speed={0.18} p={[1.4, 0, -1.3]}>
        <P c="#ffd166" p={[0, 2.1, 0]} s={[0.18, 4.2, 0.18]} />
        <P c="#ffd166" p={[-1.1, 4.1, 0]} s={[3.2, 0.14, 0.14]} />
        <P c="#4a5568" p={[0.6, 3.95, 0]} s={[0.4, 0.3, 0.3]} />
        <P g="cyl6" c="#cfe3ff" p={[-1.9, 3.5, 0]} s={[0.015, 1.2, 0.015]} />
        <P c="#ffd166" p={[-1.9, 2.85, 0]} s={[0.3, 0.2, 0.3]} />
      </Spin>
      {[[1.4, 1.3, 0], [1.75, 1.3, 0], [1.55, 1.3, 0.32]].map(([x, z, y], i) => <P key={i} c={i ? '#f6ad55' : '#ffd166'} p={[x, 0.15 + y, z]} s={0.3} />)}
      <P g="cone" c="#ff8a3d" p={[-1.6, 0.18, 1.5]} s={[0.2, 0.36, 0.2]} />
      <P g="cone" c="#ff8a3d" p={[-1.2, 0.18, 1.6]} s={[0.2, 0.36, 0.2]} />
      {lights && <pointLight color="#ffd166" intensity={5} distance={5} position={[1.2, 2.5, 0.5]} />}
    </group>
  );
}

export function Diorama({ kind, accent, lights = false }: { kind: BuildingKind; accent: string; lights?: boolean }) {
  switch (kind) {
    case 'tower': return <Tower lights={lights} />;
    case 'altar': return <Altar lights={lights} />;
    case 'pagoda': return <Pagoda lights={lights} />;
    case 'treehouse': return <Treehouse lights={lights} />;
    case 'school': return <School accent={accent} />;
    case 'hall': return <Hall accent={accent} />;
    case 'library': return <Library accent={accent} />;
    case 'kiosk': return <Kiosk accent={accent} />;
    case 'workshop': return <Workshop lights={lights} />;
  }
}

/** 每種箱庭的打光預設（環境光色、主光色與強度） */
export const LIGHTING: Record<BuildingKind, { ambient: string; ambientI: number; sun: string; sunI: number; hemi: [string, string] }> = {
  tower: { ambient: '#3a6a8a', ambientI: 0.55, sun: '#bfe9ff', sunI: 1.6, hemi: ['#22e4ff', '#0a141e'] },
  altar: { ambient: '#6a4a9a', ambientI: 0.6, sun: '#ffe2b0', sunI: 1.6, hemi: ['#b98cff', '#1a0d2e'] },
  pagoda: { ambient: '#6f7690', ambientI: 0.5, sun: '#c9d6ff', sunI: 1.4, hemi: ['#ffe9b0', '#24221d'] },
  treehouse: { ambient: '#5a8a7a', ambientI: 0.55, sun: '#d8fff0', sunI: 1.4, hemi: ['#9effc9', '#2a1d12'] },
  school: { ambient: '#ffffff', ambientI: 0.85, sun: '#fff1d6', sunI: 2.4, hemi: ['#cfe6ff', '#8b6b4a'] },
  hall: { ambient: '#ffffff', ambientI: 0.85, sun: '#fff1d6', sunI: 2.4, hemi: ['#cfe6ff', '#8b6b4a'] },
  library: { ambient: '#ffffff', ambientI: 0.85, sun: '#fff1d6', sunI: 2.4, hemi: ['#cfe6ff', '#8b6b4a'] },
  kiosk: { ambient: '#ffffff', ambientI: 0.85, sun: '#fff1d6', sunI: 2.4, hemi: ['#cfe6ff', '#8b6b4a'] },
  workshop: { ambient: '#8fb4e8', ambientI: 0.65, sun: '#e6f0ff', sunI: 1.8, hemi: ['#cfe3ff', '#0a2244'] },
};
