"""
《班級成果展》3D 環境：校園園遊會的午後
· 起伏草地上一圈彩色攤位帳篷（每座帳篷都是一個班級作品攤）、遠處校舍與操場
· 飄浮的彩色氣球（Bob 上下漂浮）、白雲、小浮島
· 主島由草丘底座接住（env.cradle mound）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_classfair.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('cloud', srgb('#ffffff'), rough=1.0)
material('wall', srgb('#f6f1e7'), rough=0.85)
material('roof_s', srgb('#e8452c'), rough=0.6)
material('window', srgb('#a9cdf0'), rough=0.2)
material('track', srgb('#d9734f'), rough=0.95)
TENT = [('#e8452c', 'tent_r'), ('#f0b400', 'tent_y'), ('#3b82f6', 'tent_b'), ('#14b8a6', 'tent_t'), ('#f472b6', 'tent_p')]
for hexc, name in TENT:
    material(name, srgb(hexc), rough=0.7)
G = 'env'
FLOOR = -7.6
_, grid = env.terrain('fair', radius=72, res=84, floor_z=FLOOR, rim_h=7, valley_r=13, rough=2.0, seed=33,
                      palette=((0.0, '#86c46e'), (0.5, '#a4d483'), (1.0, '#cfe0a4')),
                      patches=[('#e8d9a6', 0.7), ('#72b25e', 0.7)])

# 園遊會攤位帳篷：一圈圍著主島
for i in range(12):
    a = i / 12 * math.tau + 0.15
    r = 15 + (i % 3) * 2.5
    x, y = math.cos(a) * r, math.sin(a) * r
    z = env.height_at(grid, x, y)
    _, m = TENT[i % len(TENT)]
    box('stall', (2.2, 1.6, 1.1), (x, y, z + 0.55), 'wall', rot=(0, 0, a), group=G, bevel=0.03)
    cone('tent', 1.9, 0.05, 1.3, (x, y, z + 1.75), m, verts=4, rot=(0, 0, a + math.pi / 4), group=G)
    for s in (-1, 1):
        cyl('tent_pole', 0.06, 1.2, (x + math.cos(a + math.pi / 2) * s * 1.0, y + math.sin(a + math.pi / 2) * s * 1.0, z + 0.6), 'white', verts=6, group=G)
# 樹
for i, (x, y, z) in enumerate(env.scatter(grid, 30, 22, 46, seed=9)):
    kit.tree((x, y, z), s=1.3 + (i % 5) * 0.2, group=G, detail=0)
# 遠處校舍與操場跑道
for i, (a, r) in enumerate([(1.5, 36), (2.3, 34)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    z = env.height_at(grid, x, y)
    ang = a + math.pi / 2
    box('school', (8, 2.4, 3.2), (x, y, z + 1.6), 'wall', rot=(0, 0, ang), group=G, bevel=0.06)
    box('school_roof', (8.3, 2.7, 0.3), (x, y, z + 3.35), 'roof_s', rot=(0, 0, ang), group=G, bevel=0.04)
    for k in range(7):
        u = -3.0 + k * 1.0
        for lv in (1.2, 2.3):
            box('school_win', (0.55, 0.05, 0.5), (x + math.cos(ang) * u - math.sin(ang) * 1.22, y + math.sin(ang) * u + math.cos(ang) * 1.22, z + lv), 'window', rot=(0, 0, ang), group=G, bevel=0)
tx, ty = math.cos(0.9) * 30, math.sin(0.9) * 30
kit.torus('track', 4.2, 0.6, (tx, ty, env.height_at(grid, tx, ty) + 0.05), 'track', major=40, minor=4, group=G)
# 雲與小浮島
for i in range(8):
    a = i / 8 * math.tau + 0.3
    env.cloud((math.cos(a) * 27, math.sin(a) * 27, 7.5 + (i % 3) * 1.5), s=1.7)
for (a, r, z, s) in [(1.0, 10.5, -2.4, 0.9), (2.7, 11.5, -1.0, 0.7), (4.1, 10.2, -3.0, 1.0)]:
    env.floating_islet((math.cos(a) * r, math.sin(a) * r, z), s, top='grass')
# 彩色氣球（四組，Bob 上下漂浮）
for g in range(4):
    for k in range(5):
        a = g * 1.6 + k * 0.25 + 0.5
        r = 6.5 + k * 0.5
        x, y, z = math.cos(a) * r, math.sin(a) * r, 1.5 + g * 0.9 + (k % 3) * 0.6
        _, m = TENT[(g + k) % len(TENT)]
        kit.sphere('balloon', 0.32, (x, y, z), m, seg=10, rings=8, scale=(1, 1, 1.2), group=f'Bob{g}')
        cyl('balloon_string', 0.008, 0.9, (x, y, z - 0.8), 'white', verts=4, group=f'Bob{g}')
# 主島底座
env.cradle(FLOOR, 'mound', mats=('rock', 'grass'), stair_mat='concrete', seed=8)
env.clear_orbit()
kit.merge_group('env', 'env')
for g in range(4):
    kit.pivot(kit.merge_group(f'Bob{g}', f'balloons{g}'), f'Bob{g}', (0, 0, 0))
kit.export(OUT)
