/**
 * 首頁「萬界匯聚」宇宙背景：
 * - NebulaDome：fbm 噪聲星雲穹頂（金、靛、青、緋四色雲氣），中央地平線處有匯聚光芒，緩慢流動
 * - DustLayers：兩層不同距離、不同轉速的星塵（深度視差）
 * - WorldFragments：遠方漂浮的各風格「世界碎片」剪影（塔、亭、樹、水晶、書、齒輪），緩慢公轉
 * 全部只用 1 個 Shader 球 + 2 組 Points + 1 組 InstancedMesh，成本極低。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../lib/random';

const NEBULA_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const NEBULA_FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float t = uTime * 0.012;
  vec3 q = d * 2.2 + vec3(t, t * 0.6, -t * 0.4);
  float n1 = fbm(q + fbm(q * 1.7 + 3.1));          // 扭曲雲氣
  float n2 = fbm(q * 2.4 - vec3(1.3, t, 2.7));
  float band = exp(-pow(d.y * 2.6 + 0.15, 2.0));   // 銀河帶（靠近地平線）
  vec3 deep = mix(vec3(0.012, 0.010, 0.030), vec3(0.030, 0.020, 0.060), smoothstep(-0.6, 0.8, d.y));
  vec3 col = deep;
  col += vec3(0.32, 0.20, 0.55) * pow(n1, 3.0) * 1.6 * (0.4 + band);       // 靛紫
  col += vec3(0.05, 0.38, 0.48) * pow(n2, 3.4) * 1.3 * band;               // 青
  col += vec3(0.70, 0.30, 0.38) * pow(n1 * n2, 2.2) * 2.2 * band;          // 緋
  // 匯聚光芒：遠方中心（-Z 方向）的金色光暈
  float core = pow(max(dot(d, normalize(vec3(0.0, 0.08, -1.0))), 0.0), 26.0);
  col += vec3(1.0, 0.78, 0.45) * core * 0.38;
  col += vec3(0.95, 0.70, 0.40) * pow(n1, 2.0) * core * 0.6;
  // 細碎亮星
  float s = step(0.9975, hash(floor(d * 420.0)));
  col += vec3(s) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(d * 420.0)) * 30.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function NebulaDome() {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: NEBULA_VERT,
      fragmentShader: NEBULA_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
    [],
  );
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt; });
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[150, 48, 24]} />
    </mesh>
  );
}

function dustGeometry(count: number, rMin: number, rMax: number, seed: number) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color('#f3d79a'), new THREE.Color('#9fb4ff'), new THREE.Color('#ff9ec4'), new THREE.Color('#9effc9')];
  for (let i = 0; i < count; i++) {
    const r = rMin + rnd() * (rMax - rMin);
    const a = rnd() * Math.PI * 2;
    const y = (rnd() - 0.5) * 30;
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    const c = palette[Math.floor(rnd() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function DustLayers() {
  const near = useMemo(() => dustGeometry(900, 26, 46, 7), []);
  const far = useMemo(() => dustGeometry(1400, 50, 90, 13), []);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), []);
  const matFar = useMemo(() => new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), []);
  const a = useRef<THREE.Points>(null);
  const b = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (a.current) a.current.rotation.y += dt * 0.012;
    if (b.current) b.current.rotation.y -= dt * 0.005;
  });
  return (
    <>
      <points ref={a} geometry={near} material={mat} />
      <points ref={b} geometry={far} material={matFar} />
    </>
  );
}

/** 遠方的世界碎片：各風格的小剪影浮島（同一個 InstancedMesh 的漂浮岩塊 + 頂上的小地標） */
export function WorldFragments() {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const rnd = mulberry32(99);
    const kinds = ['tower', 'pagoda', 'tree', 'crystal', 'book', 'gear'] as const;
    return Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.2;
      const r = 78 + rnd() * 22;
      return { p: new THREE.Vector3(Math.cos(a) * r, -42 + rnd() * 14, Math.sin(a) * r), s: 1.4 + rnd() * 1.4, kind: kinds[i % kinds.length], phase: rnd() * 6 };
    });
  }, []);
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2238', roughness: 1, flatShading: true, fog: false }), []);
  const glow = useMemo(() => ({
    tower: new THREE.MeshBasicMaterial({ fog: false, color: '#22e4ff', toneMapped: false }),
    pagoda: new THREE.MeshBasicMaterial({ fog: false, color: '#ffb86b', toneMapped: false }),
    tree: new THREE.MeshBasicMaterial({ fog: false, color: '#9effc9', toneMapped: false }),
    crystal: new THREE.MeshBasicMaterial({ fog: false, color: '#c79bff', toneMapped: false }),
    book: new THREE.MeshBasicMaterial({ fog: false, color: '#ff9ec4', toneMapped: false }),
    gear: new THREE.MeshBasicMaterial({ fog: false, color: '#ffd166', toneMapped: false }),
  }), []);
  const geo = useMemo(() => ({
    rock: new THREE.DodecahedronGeometry(1, 0),
    cone: new THREE.ConeGeometry(0.5, 1, 4),
    box: new THREE.BoxGeometry(1, 1, 1),
    oct: new THREE.OctahedronGeometry(0.6, 0),
    torus: new THREE.TorusGeometry(0.5, 0.14, 6, 12),
  }), []);
  const refs = useRef<THREE.Group[]>([]);
  useFrame(({ clock }, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.008;
    refs.current.forEach((g, i) => { if (g) g.position.y = items[i].p.y + Math.sin(clock.elapsedTime * 0.25 + items[i].phase) * 0.8; });
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g; }} position={it.p} scale={it.s}>
          <mesh geometry={geo.rock} material={rock} scale={[1.3, 0.55, 1.3]} />
          <mesh geometry={geo.cone} material={rock} position={[0, -0.9, 0]} scale={[1.6, 1.4, 1.6]} rotation={[Math.PI, 0, 0]} />
          {it.kind === 'tower' && <mesh geometry={geo.box} material={glow.tower} position={[0, 1.3, 0]} scale={[0.35, 2.2, 0.35]} />}
          {it.kind === 'pagoda' && <mesh geometry={geo.cone} material={glow.pagoda} position={[0, 1.0, 0]} scale={[1.2, 1, 1.2]} />}
          {it.kind === 'tree' && <mesh geometry={geo.oct} material={glow.tree} position={[0, 1.0, 0]} scale={[1.1, 1.3, 1.1]} />}
          {it.kind === 'crystal' && <mesh geometry={geo.oct} material={glow.crystal} position={[0, 1.2, 0]} scale={[0.5, 1.4, 0.5]} />}
          {it.kind === 'book' && <mesh geometry={geo.box} material={glow.book} position={[0, 0.7, 0]} scale={[1.2, 0.18, 0.8]} rotation={[0, 0.4, 0.1]} />}
          {it.kind === 'gear' && <mesh geometry={geo.torus} material={glow.gear} position={[0, 1.0, 0]} rotation={[0, 0.6, 0]} />}
        </group>
      ))}
    </group>
  );
}
