/**
 * 首頁：3D 浮空微縮群島。每件作品是一座懸浮在星空中的箱庭島嶼。
 * - 拖曳旋轉 / 滾輪縮放（OrbitControls，阻尼、限制仰角）
 * - 懸停：島嶼浮起、顯示名稱標籤
 * - 點擊：鏡頭平滑飛向島嶼，再切換到作品介紹頁
 * 效能：dpr 上限 1.5、幾何與材質全站共用、群島不使用點光源。
 */
import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Project } from '../data/projects';
import { themes } from '../themes';
import { Diorama } from './dioramas';
import { ACCENT, DEFAULT_BUILDING } from './kinds';

export interface MapWorldProps {
  projects: Project[];
  portrait: boolean;
  reducedMotion: boolean;
  /** 鏡頭飛抵後呼叫；screen = 島嶼在螢幕上的位置（給 2D 轉場做焦點） */
  onEnter: (id: string, screen: { x: number; y: number }) => void;
  /** 回報每座島在螢幕上的位置（返回大地圖時的鏡頭焦點） */
  onMeasure: (id: string, screen: { x: number; y: number }) => void;
}

/** 群島位置 [x, y(高度), z]：橫式兩排錯落、直式兩欄 */
const LANDSCAPE: [number, number, number][] = [
  [-10.5, 0.6, -5.5], [-3.6, -0.2, -7.2], [3.6, 0.8, -5.8], [10.5, 0.1, -7],
  [13.5, -0.2, 3.2], [7.8, 0.5, 5.2], [2.4, -0.4, 3.2], [-3.2, 0.4, 5.6], [-8.6, -0.1, 3.4], [-14, 0.4, 5.4],
];
function slot(i: number, portrait: boolean): [number, number, number] {
  if (portrait) return [i % 2 ? 3.4 : -3.4, (i % 3) * 0.4 - 0.4, -15.3 + i * 3.4];
  const s = LANDSCAPE[i];
  if (s) return [s[0] * 0.88 + 1.2, s[1], s[2] * 0.95];
  return LANDSCAPE[i] ?? [-14 + ((i - 10) % 6) * 5.6, 0, 11 + Math.floor((i - 10) / 6) * 6];
}

const tmp = new THREE.Vector3();

function Island({
  project, index, pos, hovered, setHovered, onPick, flying,
}: {
  project: Project; index: number; pos: [number, number, number];
  hovered: boolean; setHovered: (id: string | null) => void; onPick: (id: string, world: THREE.Vector3) => void; flying: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const kind = project.building ?? DEFAULT_BUILDING[project.theme];
  const accent = project.accent ?? ACCENT[project.theme];
  const theme = themes[project.theme];
  const rotY = useMemo(() => ((index * 47) % 90) * (Math.PI / 180) - Math.PI / 4, [index]);

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    lift.current += ((hovered ? 0.7 : 0) - lift.current) * Math.min(1, dt * 7);
    g.position.y = pos[1] + Math.sin(clock.elapsedTime * 0.55 + index * 1.7) * 0.18 + lift.current;
  });

  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (!flying) setHovered(project.id); };
  const out = () => setHovered(null);
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (ref.current) onPick(project.id, ref.current.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0)));
  };

  return (
    <group ref={ref} position={pos} onPointerOver={over} onPointerOut={out} onClick={click}>
      <group rotation={[0, rotY, 0]}>
        <Diorama kind={kind} accent={accent} />
      </group>
      {hovered && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[2.9, 3.1, 48]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} />
          </mesh>
          <Html position={[0, 5.4, 0]} center distanceFactor={22} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="island-tag" style={{ ['--c' as string]: accent }}>
              <b>{project.title}</b>
              <small>{theme.label}{project.status === 'dev' ? ' · 開發中' : project.status === 'maintenance' ? ' · 維修中' : ''}</small>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

/** 鏡頭飛行：把相機與注視點平滑移到目標島嶼前方，抵達後回呼 */
function CameraRig({ flight, controls }: { flight: MutableRefObject<{ target: THREE.Vector3; t: number; done: () => void } | null>; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const f = flight.current;
    if (!f) return;
    f.t += dt;
    const k = 1 - Math.pow(0.0025, dt);
    const dest = tmp.copy(f.target).add(new THREE.Vector3(0, 3.2, 6.5));
    camera.position.lerp(dest, k);
    controls.current?.target.lerp(f.target, k);
    if (f.t > 0.85) {
      const done = f.done;
      flight.current = null;
      done();
    }
  });
  return null;
}

/** 定期回報各島在螢幕上的位置 */
function Projector({ islands, onMeasure }: { islands: MutableRefObject<Map<string, THREE.Vector3>>; onMeasure: MapWorldProps['onMeasure'] }) {
  const { camera, size } = useThree();
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.5) return;
    last.current = clock.elapsedTime;
    islands.current.forEach((v, id) => {
      tmp.copy(v).project(camera);
      onMeasure(id, { x: (tmp.x * 0.5 + 0.5) * size.width, y: (-tmp.y * 0.5 + 0.5) * size.height });
    });
  });
  return null;
}

export default function MapWorld({ projects, portrait, reducedMotion, onEnter, onMeasure }: MapWorldProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const flight = useRef<{ target: THREE.Vector3; t: number; done: () => void } | null>(null);
  const positions = useMemo(() => projects.map((_, i) => slot(i, portrait)), [projects, portrait]);
  const worldPos = useRef(new Map<string, THREE.Vector3>());
  worldPos.current = new Map(projects.map((p, i) => [p.id, new THREE.Vector3(positions[i][0], positions[i][1] + 1.2, positions[i][2])]));

  const pick = (id: string, world: THREE.Vector3) => {
    if (flight.current) return;
    setHovered(null);
    setFlying(true);
    const send = (cam: THREE.Camera, w: number, h: number) => {
      tmp.copy(world).project(cam);
      onEnter(id, { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h });
    };
    if (reducedMotion) {
      send(cameraRef.current!, window.innerWidth, window.innerHeight);
      return;
    }
    flight.current = { target: world, t: 0, done: () => send(cameraRef.current!, window.innerWidth, window.innerHeight) };
  };
  const cameraRef = useRef<THREE.Camera | null>(null);

  const camPos: [number, number, number] = portrait ? [0, 46, 17] : [1.2, 18, 27];

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: camPos, fov: portrait ? 52 : 40, near: 0.5, far: 220 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ camera }) => { cameraRef.current = camera; }}
      onPointerMissed={() => setHovered(null)}
      style={{ cursor: hovered ? 'pointer' : 'grab' }}
    >
      <fog attach="fog" args={['#0b0a09', 40, 95]} />
      <ambientLight color="#8a90b8" intensity={0.55} />
      <hemisphereLight args={['#ffe9c4', '#1a1430', 0.55]} />
      <directionalLight
        color="#fff1d6"
        intensity={2}
        position={[14, 22, 10]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      <Stars radius={90} depth={50} count={2600} factor={3.2} saturation={0.3} fade speed={reducedMotion ? 0 : 0.4} />

      {projects.map((p, i) => (
        <Island
          key={p.id}
          project={p}
          index={i}
          pos={positions[i]}
          hovered={hovered === p.id}
          setHovered={setHovered}
          onPick={pick}
          flying={flying}
        />
      ))}

      <CameraRig flight={flight} controls={controls} />
      <Projector islands={worldPos} onMeasure={onMeasure} />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!flying}
        target={portrait ? [0, 0, 1.2] : [1.2, 2.4, 0]}
        enableDamping
        dampingFactor={0.07}
        enablePan={false}
        minDistance={10}
        maxDistance={portrait ? 70 : 48}
        minPolarAngle={0.25}
        maxPolarAngle={1.2}
        autoRotate={!reducedMotion && !hovered && !flying}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}
