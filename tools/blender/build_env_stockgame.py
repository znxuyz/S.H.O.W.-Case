"""
《神獸股市》3D 環境：山海經天界
· 主島下方是翻湧的雲海；四周懸浮著帶殿宇的仙山與瀑布
· 天空中一座巨大的光環天門；遠方三尊巨大的神獸靈影（專案原創立繪，面向鏡頭）＝13 大世界觀
· 金色靈光碎片緩緩環繞（Spin）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_stockgame.glb'
ASSETS = os.environ.get('STOCKGAME_DIR', '/home/user/znxuyz/stockgame/public')
kit.reset()
kit.standard_materials()
material('cloudsea', srgb('#d9cbf2'), rough=1.0, emit=srgb('#6a4a9a'), emit_strength=0.25)
material('cloudsea2', srgb('#b8a2e2'), rough=1.0, emit=srgb('#4a2a7a'), emit_strength=0.25)
material('mount', srgb('#3a2160'), rough=0.95)
material('mount_top', srgb('#5e3786'), rough=0.9)
material('temple', srgb('#7a2a3a'), rough=0.6)
material('roof', srgb('#2a1745'), rough=0.6)
material('gold', srgb('#ffc76b'), rough=0.25, metal=0.95)
material('gate', srgb('#ffd98a'), emit=srgb('#ffc76b'), emit_strength=2.5)
material('fall', srgb('#d8f4ff'), emit=srgb('#bff3ff'), emit_strength=1.2, alpha=0.6)
material('shard', srgb('#ffe2a0'), emit=srgb('#ffc76b'), emit_strength=4)
G = 'env'

# 雲海：兩層大量雲團
rnd = kit.random.Random(5)
for i in range(110):
    a = rnd.random() * math.tau
    r = 5 + rnd.random() * 60
    x, y = math.cos(a) * r, math.sin(a) * r
    s = 1.4 + rnd.random() * 2.2
    o = kit.ico('cloud', s, (x, y, -12 - rnd.random() * 1.5), 'cloudsea' if i % 3 else 'cloudsea2', sub=1, scale=(1.7, 1.4, 0.45), group=G)
    for poly in o.data.polygons:
        poly.use_smooth = True

# 仙山（倒錐浮岩 + 頂部殿宇 + 瀑布）
def sky_mountain(x, y, z, s, seed):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=2.2 * s, radius2=0.2, depth=6 * s, location=(x, y, z - 3 * s), rotation=(math.pi, 0, 0))
    o = bpy.context.active_object
    for v in o.data.vertices:
        v.co.x *= 0.85 + rnd.random() * 0.3
        v.co.y *= 0.85 + rnd.random() * 0.3
    kit.finalize(o, 'mount', G)
    kit.cyl('mount_top', 2.25 * s, 0.4 * s, (x, y, z + 0.2 * s), 'mount_top', verts=8, group=G)
    if seed % 2 == 0:
        box('temple', (1.3 * s, 1.0 * s, 0.8 * s), (x, y, z + 0.8 * s), 'temple', group=G, bevel=0.05)
        cone('temple_roof', 1.2 * s, 0.1, 0.6 * s, (x, y, z + 1.5 * s), 'roof', verts=4, rot=(0, 0, math.pi / 4), group=G)
        cyl('temple_spire', 0.06 * s, 0.6 * s, (x, y, z + 2.0 * s), 'gold', verts=6, group=G)
    else:
        cone('peak', 1.0 * s, 0.1, 2.4 * s, (x, y, z + 1.4 * s), 'mount_top', verts=6, group=G)
    box('waterfall', (0.4 * s, 0.05, 4 * s), (x + 1.6 * s, y, z - 1.8 * s), 'fall', group=G, bevel=0)


for i, (a, r, z, s) in enumerate([(0.7, 18, 2, 1.2), (1.6, 24, 6, 1.6), (2.4, 20, 0, 1.0), (3.1, 30, 8, 2.0), (4.2, 26, 3, 1.3), (5.0, 22, -1, 0.9), (0.2, 34, 9, 2.2), (2.0, 40, 12, 2.6)]):
    sky_mountain(math.cos(a) * r, math.sin(a) * r, z, s, i)

# 天門光環（遠方高空）
for k, (R, w) in enumerate([(9, 0.25), (7.6, 0.12), (10.6, 0.08)]):
    kit.torus('gate_ring', R, w, (6, 46, 16), 'gate', rot=(math.pi / 2, 0, 0.2), group=G, major=96, minor=8)
for k in range(24):
    a = k / 24 * math.tau
    box('gate_tick', (0.18, 0.12, 1.0), (6 + math.cos(a) * 9.7 * math.cos(0.2), 46 + math.sin(0.2) * math.cos(a) * 9.7, 16 + math.sin(a) * 9.7), 'gate', rot=(0, -a, 0), group=G, bevel=0)

# 巨大神獸靈影（立繪看板，永遠面向鏡頭）
for i, (name, a, r, z, h) in enumerate([('zhang-yu-mo-huang', 1.1, 42, 6, 16), ('bing-jing-die-xian', 2.5, 40, 8, 14), ('ba-gua-jing-dun', 0.3, 44, 4, 13)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    kit.image_card(f'spirit_{i}', os.path.join(ASSETS, f'sprites/{name}.png'), h, (x, y, z + h / 2), group=f'Billboard{i}')

# 環繞的金色靈光碎片
for i in range(18):
    a = i / 18 * math.tau
    r = 4.2 + (i % 4) * 0.7
    kit.ico('shard', 0.08 + (i % 3) * 0.03, (math.cos(a) * r, math.sin(a) * r, -2 + (i * 5 % 9) * 0.6), 'shard', sub=0, scale=(0.6, 0.6, 1.6), group='Spin0')

# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
material('cr_jade', srgb('#e8e4d8'), rough=0.5)
material('cr_red', srgb('#b8323a'), rough=0.6)
material('cr_gold', srgb('#ffd27a'), emit=srgb('#ffc24a'), emit_strength=2.0)
env.cradle(-12.0, 'tiers', mats=('cr_jade', 'cr_red'), accent='cr_gold', stair_mat='cr_jade')
# 鏡頭環繞淨空：會擋住自動環繞視線的物件推到環繞圈外
env.clear_orbit()
kit.merge_group('env', 'env')
for i, (name, a, r, z, h) in enumerate([('zhang-yu-mo-huang', 1.1, 42, 6, 16), ('bing-jing-die-xian', 2.5, 40, 8, 14), ('ba-gua-jing-dun', 0.3, 44, 4, 13)]):
    kit.pivot(kit.merge_group(f'Billboard{i}', f'spirit{i}'), f'Billboard{i}', (math.cos(a) * r, math.sin(a) * r, z))
kit.pivot(kit.merge_group('Spin0', 'shards'), 'Spin0', (0, 0, 0))
kit.export(OUT)
