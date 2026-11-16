"""
《英語學習護照》3D 環境：雲海上的世界旅行
· 明亮的雲海；遠方漂浮著幾塊「小大陸」，各有世界地標剪影（風車、金字塔、鐘塔、塔樓、寶塔）
· 一道彩虹弧橫過天空；熱氣球與環繞飛行的小飛機（Spin）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_passport.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('cloud', srgb('#e9eef8'), rough=1.0)
material('cloud2', srgb('#d6e0f2'), rough=1.0)
material('land', srgb('#8fcf6a'), rough=1.0)
material('rock', srgb('#b89a72'), rough=1.0)
material('sand', srgb('#f2dfa8'), rough=1.0)
material('white', srgb('#f6f1e7'), rough=0.8)
material('red', srgb('#e45b5b'), rough=0.6)
material('blue', srgb('#4f86f7'), rough=0.6)
material('gold', srgb('#f2c230'), rough=0.4, metal=0.6)
material('plane', srgb('#ffffff'), rough=0.5)
for i, c in enumerate(['#e45b5b', '#f29b30', '#f2c230', '#36b37e', '#4f86f7', '#9b6ce0']):
    material(f'rb{i}', srgb(c), emit=srgb(c), emit_strength=0.9, alpha=0.75)
G = 'env'
rnd = kit.random.Random(8)
for i in range(120):
    a = rnd.random() * math.tau
    r = 5 + rnd.random() * 62
    o = kit.ico('cloud', 1.6 + rnd.random() * 2.4, (math.cos(a) * r, math.sin(a) * r, -12 - rnd.random() * 1.5), 'cloud' if i % 2 else 'cloud2', sub=1, scale=(1.7, 1.4, 0.5), group=G)


def continent(x, y, z, s, kind):
    bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=2.6 * s, radius2=0.2, depth=3 * s, location=(x, y, z - 1.5 * s), rotation=(math.pi, 0, 0))
    kit.finalize(bpy.context.active_object, 'rock', G)
    kit.cyl('land', 2.65 * s, 0.4 * s, (x, y, z + 0.2 * s), 'sand' if kind == 'pyramid' else 'land', verts=9, group=G)
    zt = z + 0.4 * s
    if kind == 'windmill':
        cone('mill', 0.6 * s, 0.35 * s, 2.4 * s, (x, y, zt + 1.2 * s), 'white', verts=8, group=G)
        for k in range(4):
            a = k * math.pi / 2 + 0.3
            box('blade', (0.2 * s, 0.06, 1.8 * s), (x + math.cos(a) * 0.9 * s, y - 0.62 * s, zt + 2.3 * s + math.sin(a) * 0.9 * s), 'white', rot=(0, -a + math.pi / 2, 0), group=G, bevel=0)
    elif kind == 'pyramid':
        cone('pyramid', 1.8 * s, 0, 2.2 * s, (x, y, zt + 1.1 * s), 'sand', verts=4, rot=(0, 0, math.pi / 4), group=G)
    elif kind == 'clock':
        box('clock_tower', (0.8 * s, 0.8 * s, 3.4 * s), (x, y, zt + 1.7 * s), 'rock', group=G, bevel=0.05)
        cyl('clock_face', 0.3 * s, 0.05, (x, y - 0.42 * s, zt + 2.8 * s), 'white', rot=(math.pi / 2, 0, 0), verts=16, group=G)
        cone('clock_spire', 0.6 * s, 0, 1.2 * s, (x, y, zt + 4.0 * s), 'blue', verts=4, rot=(0, 0, math.pi / 4), group=G)
    elif kind == 'tower':
        for k in range(3):
            w = (1.2 - k * 0.35) * s
            cone('lattice', w, w * 0.6, 1.4 * s, (x, y, zt + 0.7 * s + k * 1.4 * s), 'rock', verts=4, rot=(0, 0, math.pi / 4), group=G)
        cyl('tower_tip', 0.06 * s, 1.0 * s, (x, y, zt + 4.6 * s), 'rock', verts=6, group=G)
    elif kind == 'pagoda':
        for k in range(4):
            w = (1.1 - k * 0.2) * s
            box('pg', (w, w, 0.45 * s), (x, y, zt + 0.25 * s + k * 0.7 * s), 'red', group=G, bevel=0.03)
            cone('pg_roof', w * 0.95, 0.05, 0.3 * s, (x, y, zt + 0.6 * s + k * 0.7 * s), 'blue', verts=4, rot=(0, 0, math.pi / 4), group=G)
    for k in range(3):
        a = rnd.random() * math.tau
        kit.tree((x + math.cos(a) * 1.8 * s, y + math.sin(a) * 1.8 * s, zt), s=0.8 * s, group=G, detail=0)


for i, (kind, a, r, z, s) in enumerate([('windmill', 0.75, 30, -2, 1.3), ('pyramid', 1.45, 38, 0, 1.6), ('clock', 2.75, 36, -4, 1.3), ('tower', 3.45, 42, 1, 1.5), ('pagoda', 4.1, 34, -1, 1.3)]):
    continent(math.cos(a) * r, math.sin(a) * r, z, s, kind)
# 彩虹
for i in range(6):
    kit.torus('rainbow', 30 - i * 0.9, 0.42, (4, 40, -8), f'rb{i}', rot=(math.pi / 2, 0, 0.15), group=G, major=96, minor=6)
# 熱氣球
for i, (x, y, z, m) in enumerate([(-16, 18, 6, 'red'), (18, 14, 9, 'blue')]):
    kit.sphere('balloon', 1.4, (x, y, z), m, seg=16, rings=12, scale=(1, 1, 1.2), group=G)
    box('basket', (0.6, 0.6, 0.45), (x, y, z - 2.4), 'rock', group=G, bevel=0.05)
# 小飛機（Spin0，繞島）
R = 11.5
box('plane_body', (1.6, 0.35, 0.35), (R, 0, 3.5), 'plane', group='Spin0', bevel=0.12)
box('plane_wing', (0.5, 2.0, 0.06), (R, 0, 3.5), 'plane', group='Spin0', bevel=0.02)
box('plane_tail', (0.3, 0.6, 0.06), (R - 0.7, 0, 3.6), 'plane', group='Spin0', bevel=0.02)
box('plane_fin', (0.3, 0.06, 0.4), (R - 0.7, 0, 3.8), 'red', group='Spin0', bevel=0.02)
# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
material('cr_cloud', srgb('#ffffff'), rough=1.0)
env.cradle(-12.0, 'cloud', top=-0.9, r_top=3.0, mats=('cr_cloud', 'cr_cloud'))
# 鏡頭環繞淨空：會擋住自動環繞視線的物件推到環繞圈外
env.clear_orbit()
kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Spin0', 'plane'), 'Spin0', (0, 0, 0))
kit.export(OUT)
