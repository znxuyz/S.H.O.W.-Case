"""
《國小排課系統》3D 環境：約束空間
· 主島下方是深藍格線深淵；四周懸浮著大小不一的課表板（彩色課程方塊）
· 發光的約束網絡：節點柱之間以光線相連（老師 × 班級 × 教室）
· 遠方巨大的時鐘環與兩組黃銅齒輪緩緩轉動（Spin / SpinR）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import box, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_scheduling.glb'
kit.reset()
kit.standard_materials()
material('abyss', srgb('#061630'), rough=0.6, metal=0.3)
material('gridline', srgb('#2f6cb8'), emit=srgb('#3f8cff'), emit_strength=0.6)
material('slab', srgb('#0f2a50'), rough=0.4, metal=0.4)
material('slab_edge', srgb('#9fd8ff'), emit=srgb('#7fc4ff'), emit_strength=1.4)
material('edge', srgb('#7fd0ff'), emit=srgb('#5fb8ff'), emit_strength=2.0)
material('node', srgb('#ffc24a'), emit=srgb('#ffb02a'), emit_strength=3)
material('node_b', srgb('#7fd0ff'), emit=srgb('#5fb8ff'), emit_strength=3)
material('brass', srgb('#c9a24a'), rough=0.3, metal=0.9)
material('clock', srgb('#9fd8ff'), emit=srgb('#9fd8ff'), emit_strength=1.6)
COLS = ['#e45b5b', '#4f86f7', '#f29b30', '#36b37e', '#9b6ce0', '#ef5d9c', '#1fb6c9', '#f2c230']
for i, c in enumerate(COLS):
    material(f'c{i}', srgb(c), emit=srgb(c), emit_strength=0.8)
G = 'env'
F = -16.0
box('abyss', (160, 160, 0.4), (0, 0, F), 'abyss', group=G, bevel=0)
for k in range(-20, 21):
    w = 0.1 if k % 5 else 0.22
    box('gx', (160, w, 0.03), (0, k * 4, F + 0.22), 'gridline', group=G, bevel=0)
    box('gy', (w, 160, 0.03), (k * 4, 0, F + 0.22), 'gridline', group=G, bevel=0)

rnd = kit.random.Random(3)
# 懸浮課表板
for i in range(14):
    a = i / 14 * math.tau + rnd.random() * 0.3
    if -1.9 < (a if a <= math.pi else a - math.tau) < 0.35 and i % 2:
        continue
    r = 20 + rnd.random() * 18
    x, y, z = math.cos(a) * r, math.sin(a) * r, -8 + rnd.random() * 16
    s = 1.2 + rnd.random() * 1.4
    ang = rnd.random() * 0.6 - 0.3
    box('slab', (5 * s, 3.8 * s, 0.25), (x, y, z), 'slab', rot=(ang, 0.2, a), group=G, bevel=0.05)
    for d in range(5):
        for p in range(4):
            if rnd.random() < 0.8:
                u, v = (-2 + d) * s, (-1.4 + p * 0.95) * s
                bx = x + u * math.cos(a) - v * math.sin(a)
                by = y + u * math.sin(a) + v * math.cos(a)
                box('cell', (0.8 * s, 0.7 * s, 0.3 * s), (bx, by, z + 0.25 + v * math.sin(ang) * 0.0), f'c{(d * 3 + p + i) % 8}', rot=(ang, 0.2, a), group=G, bevel=0.04)
# 約束網絡：節點柱與發光邊
nodes = []
for i in range(22):
    a = rnd.random() * math.tau
    r = 12 + rnd.random() * 26
    nodes.append((math.cos(a) * r, math.sin(a) * r, -10 + rnd.random() * 18))
for i, p in enumerate(nodes):
    kit.sphere('node', 0.35 + (i % 3) * 0.12, p, 'node' if i % 4 == 0 else 'node_b', seg=10, rings=6, group=G)
    near = sorted(range(len(nodes)), key=lambda j: math.dist(p, nodes[j]))[1:3]
    for j in near:
        if j > i:
            kit.beam('edge', p, nodes[j], 0.06, 'edge', group=G, round_=True)
# 時鐘環（遠方垂直）
CX, CY, CZ = -6, 40, 10
kit.torus('clock_ring', 11, 0.2, (CX, CY, CZ), 'clock', rot=(math.pi / 2, 0, 0), group=G, major=96, minor=6)
for k in range(60):
    a = k / 60 * math.tau
    long = k % 5 == 0
    box('tick', (0.25, 0.2, 1.4 if long else 0.6), (CX + math.cos(a) * 10.2, CY, CZ + math.sin(a) * 10.2), 'clock', rot=(0, -a + math.pi / 2, 0), group=G, bevel=0)
# 齒輪（Spin / SpinR，以自身中心為軸轉動）
def gear(name, loc, R, teeth, group):
    cyl(f'{name}_disc', R, 0.6, loc, 'brass', rot=(math.pi / 2, 0, 0), verts=40, group=group)
    for t in range(teeth):
        a = t / teeth * math.tau
        box(f'{name}_tooth', (0.7, 0.6, 0.9), (loc[0] + math.cos(a) * (R + 0.35), loc[1], loc[2] + math.sin(a) * (R + 0.35)), 'brass', rot=(0, -a, 0), group=group, bevel=0.05)
gear('gearA', (22, 30, -2), 5, 22, 'GearA')
gear('gearB', (29.6, 30, -6.5), 3.2, 14, 'GearB')
kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('GearA', 'gearA'), 'GearA', (22, 30, -2))
kit.pivot(kit.merge_group('GearB', 'gearB'), 'GearB', (29.6, 30, -6.5))
kit.export(OUT)
