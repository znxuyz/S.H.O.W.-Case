"""
《平板載具文件專區》3D 環境：數位圖書館
· 深色反光地面，四周是高聳的發光書架（書背＝PDF 紅 / Word 藍 / 表單白）
· 書架之間懸浮著文件卡流，像資料流一樣緩緩繞行（Spin）
· 高處的圓頂天窗光環
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import box, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_tablet.glb'
kit.reset()
kit.standard_materials()
material('floor', srgb('#071824'), rough=0.15, metal=0.5)
material('shelf', srgb('#0f2a3a'), rough=0.5, metal=0.3)
material('shelf_edge', srgb('#5fd8ff'), emit=srgb('#5fd8ff'), emit_strength=1.6)
material('spine_r', srgb('#e45b5b'), emit=srgb('#e45b5b'), emit_strength=0.5)
material('spine_b', srgb('#4f86f7'), emit=srgb('#4f86f7'), emit_strength=0.5)
material('spine_w', srgb('#e8f4ff'), emit=srgb('#e8f4ff'), emit_strength=0.4)
material('doc', srgb('#ffffff'), emit=srgb('#cfefff'), emit_strength=0.6)
material('dome', srgb('#9fe8ff'), emit=srgb('#9fe8ff'), emit_strength=2)
G = 'env'
F = -9.0
cyl('floor', 70, 0.4, (0, 0, F - 0.2), 'floor', verts=64, group=G)
for k in range(1, 8):
    kit.torus('floor_ring', k * 8, 0.05, (0, 0, F + 0.01), 'shelf_edge', group=G, major=96, minor=4)
rnd = kit.random.Random(4)
for i in range(22):
    a = i / 22 * math.tau
    cam = -1.9 < (a if a <= math.pi else a - math.tau) < 0.35
    r = 34 if cam else 24
    x, y = math.cos(a) * r, math.sin(a) * r
    h = 14 + (i % 4) * 3
    ang = a + math.pi / 2
    box('shelf', (6, 1.4, h), (x, y, F + h / 2), 'shelf', rot=(0, 0, ang), group=G, bevel=0.05)
    for k in range(int(h / 2.2)):
        z = F + 1.2 + k * 2.2
        box('shelf_plank', (6.1, 1.5, 0.12), (x, y, z), 'shelf_edge', rot=(0, 0, ang), group=G, bevel=0)
        u = -2.6
        while u < 2.5:
            w = 0.25 + rnd.random() * 0.25
            hh = 1.2 + rnd.random() * 0.6
            m = rnd.choice(['spine_r', 'spine_b', 'spine_w', 'spine_b'])
            nx, ny = -math.sin(a) * 0.55, math.cos(a) * 0.55
            box('book', (w, 0.9, hh), (x + math.cos(ang) * u - nx, y + math.sin(ang) * u - ny, z + 0.06 + hh / 2), m, rot=(0, 0, ang), group=G, bevel=0)
            u += w + 0.04
# 圓頂天窗光環
for k, R in enumerate((26, 22)):
    kit.torus('dome_ring', R, 0.3, (0, 0, F + 30 + k * 2), 'dome', group=G, major=96, minor=6)
# 文件卡流（Spin0）
for i in range(28):
    a = i / 28 * math.tau
    r = 9 + (i % 3) * 1.6
    z = -2 + math.sin(i * 1.7) * 2.5
    box('doc_card', (0.5, 0.04, 0.68), (math.cos(a) * r, math.sin(a) * r, z), 'doc', rot=(0, 0, a + math.pi / 2), group='Spin0', bevel=0)
kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Spin0', 'docs'), 'Spin0', (0, 0, 0))
kit.export(OUT)
