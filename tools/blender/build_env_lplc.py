"""
《拉普拉斯預測核心》3D 環境：霓虹資料都會
· 深色網格地面（發光格線）延伸到地平線
· 外圈是高低錯落的摩天樓，帶霓虹窗帶、頂部全息環
· 巨大的 K 線石碑矗立城中；垂直資料光束從地面升起
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_lplc.glb'
kit.reset()
kit.standard_materials()
material('ground', srgb('#050c16'), rough=0.6, metal=0.3)
material('gridline', srgb('#1aa8c4'), emit=srgb('#22e4ff'), emit_strength=0.55)
material('tower', srgb('#0a1828'), rough=0.3, metal=0.7)
material('tower2', srgb('#101a2e'), rough=0.35, metal=0.6)
material('band_c', srgb('#22e4ff'), emit=srgb('#22e4ff'), emit_strength=2.4)
material('band_m', srgb('#ff3df2'), emit=srgb('#ff3df2'), emit_strength=2.4)
material('band_y', srgb('#ffd166'), emit=srgb('#ffd166'), emit_strength=2.0)
material('up', srgb('#ff2d55'), emit=srgb('#ff2d55'), emit_strength=1.6)
material('down', srgb('#00d68f'), emit=srgb('#00d68f'), emit_strength=1.6)
material('beam', srgb('#7ff3ff'), emit=srgb('#7ff3ff'), emit_strength=2.5, alpha=0.35)
G = 'env'
FLOOR = -15.0

# 地面與格線
box('ground', (150, 150, 0.2), (0, 0, FLOOR - 0.1), 'ground', group=G, bevel=0)
for k in range(-18, 19):
    w = 0.08 if k % 4 else 0.16
    box('grid_x', (150, w, 0.02), (0, k * 4.0, FLOOR + 0.01), 'gridline', group=G, bevel=0)
    box('grid_y', (w, 150, 0.02), (k * 4.0, 0, FLOOR + 0.01), 'gridline', group=G, bevel=0)

# 摩天樓（鏡頭側較矮、對面較高，形成天際線）
rnd = kit.random.Random(7)
spots = []
for i in range(90):
    a = rnd.random() * math.tau
    r = 20 + rnd.random() * 46
    x, y = math.cos(a) * r, math.sin(a) * r
    if any(math.hypot(x - px, y - py) < 3.2 for px, py in spots):
        continue
    cam_side = -1.9 < a - (math.tau if a > math.pi else 0) < 0.35
    if cam_side and r < 42:
        continue
    spots.append((x, y))
    w = 1.6 + rnd.random() * 2.2
    h = (8 + rnd.random() * 8) if cam_side else (12 + rnd.random() * 26)
    box('tower', (w, w * (0.8 + rnd.random() * 0.4), h), (x, y, FLOOR + h / 2), 'tower' if i % 2 else 'tower2', group=G, bevel=0)
    bands = ['band_c', 'band_m', 'band_y']
    for k in range(int(h / 3)):
        if rnd.random() < 0.55:
            box('band', (w + 0.04, w * 0.9 + 0.04, 0.12), (x, y, FLOOR + 1.5 + k * 3), bands[(i + k) % 3], group=G, bevel=0)
    if i % 6 == 0:
        kit.torus('holo_ring', w * 0.9, 0.06, (x, y, FLOOR + h + 0.8), 'band_c', group=G, major=24, minor=4)
        cyl('antenna', 0.06, 2.4, (x, y, FLOOR + h + 1.2), 'tower', verts=5, group=G)

# 巨大 K 線石碑（城中）
for i, (a, r) in enumerate([(1.0, 24), (1.6, 30), (2.3, 26), (2.9, 34), (0.4, 36)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    up = i % 2 == 0
    h = 7 + i * 2
    box('candle', (2.0, 2.0, h), (x, y, FLOOR + 2 + h / 2), 'up' if up else 'down', group=G, bevel=0.05)
    box('wick', (0.3, 0.3, h + 6), (x, y, FLOOR + 2 + h / 2), 'up' if up else 'down', group=G, bevel=0)

# 資料光束
for i in range(14):
    a = i / 14 * math.tau + 0.2
    r = 20 + (i % 4) * 9
    if -1.9 < a - (math.tau if a > math.pi else 0) < 0.35:
        continue
    cyl('data_beam', 0.12, 30, (math.cos(a) * r, math.sin(a) * r, FLOOR + 15), 'beam', verts=6, group=G)

# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
material('cr_metal', srgb('#1a2230'), rough=0.35, metal=0.8)
material('cr_strut', srgb('#2a3548'), rough=0.4, metal=0.7)
material('cr_neon', srgb('#22e4ff'), emit=srgb('#22e4ff'), emit_strength=4)
env.cradle(FLOOR, 'tower', mats=('cr_metal', 'cr_strut'), accent='cr_neon')
kit.merge_group('env', 'env')
kit.export(OUT)
