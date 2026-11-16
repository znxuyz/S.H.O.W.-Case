"""
《C.A.R.E. System》3D 環境：清晨的校園山谷（溫和、不帶懲罰感）
· 柔和起伏的草地與櫻花樹；遠處山坡上的校舍群與操場
· 晨霧中的小浮島，飄落的花瓣（Spin），一彎清晨的太陽
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_care.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('cloud', srgb('#ffffff'), rough=1.0)
material('sakura', srgb('#ffc2d6'), rough=0.8)
material('sakura2', srgb('#ffa8c5'), rough=0.8)
material('wall', srgb('#f6f1e7'), rough=0.85)
material('roof_t', srgb('#0f9b8e'), rough=0.6)
material('window', srgb('#a9cdf0'), rough=0.2)
material('track', srgb('#d9734f'), rough=0.95)
material('sun', srgb('#fff4d6'), emit=srgb('#ffe9b0'), emit_strength=3)
material('petal', srgb('#ffd0e0'), rough=0.6)
G = 'env'
FLOOR = -7.6
_, grid = env.terrain('morning', radius=72, res=84, floor_z=FLOOR, rim_h=8, valley_r=13, rough=2.2, seed=21,
                      palette=((0.0, '#7fbf6a'), (0.5, '#9fd07f'), (1.0, '#c9dca0')),
                      patches=[('#e6d6a0', 0.68), ('#6aa85a', 0.7)])


def sakura(x, y, z, s):
    kit.beam('sk_trunk', (x, y, z), (x + 0.2 * s, y, z + 1.4 * s), 0.18 * s, 'bark', group=G)
    for k in range(5):
        a = k * 1.25
        kit.ico('sk_crown', (0.9 - k * 0.08) * s, (x + 0.2 * s + math.cos(a) * 0.7 * s, y + math.sin(a) * 0.7 * s, z + (1.6 + (k % 2) * 0.4) * s), 'sakura' if k % 2 else 'sakura2', sub=1, group=G)


for i, (x, y, z) in enumerate(env.scatter(grid, 40, 11, 44, seed=5)):
    if i % 3 == 0:
        sakura(x, y, z, 1.2 + (i % 4) * 0.25)
    else:
        kit.tree((x, y, z), s=1.3 + (i % 5) * 0.2, group=G, detail=0)
# 遠處校舍群
for i, (a, r) in enumerate([(1.2, 34), (1.9, 38), (2.6, 33)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    z = env.height_at(grid, x, y)
    ang = a + math.pi / 2
    box('school', (7, 2.2, 2.6), (x, y, z + 1.3), 'wall', rot=(0, 0, ang), group=G, bevel=0.06)
    box('school_roof', (7.3, 2.5, 0.3), (x, y, z + 2.75), 'roof_t', rot=(0, 0, ang), group=G, bevel=0.04)
    for k in range(6):
        u = -2.8 + k * 1.1
        box('school_win', (0.6, 0.05, 0.5), (x + math.cos(ang) * u - math.sin(ang) * 1.12, y + math.sin(ang) * u + math.cos(ang) * 1.12, z + 1.6), 'window', rot=(0, 0, ang), group=G, bevel=0)
# 雲、太陽
for i in range(8):
    a = i / 8 * math.tau + 0.5
    env.cloud((math.cos(a) * 26, math.sin(a) * 26, 7 + (i % 3) * 1.5), s=1.8)
kit.sphere('sun', 3.0, (30, 44, 18), 'sun', seg=20, rings=12, group=G)
# 小浮島
for i, (a, r, z, s) in enumerate([(0.9, 10.5, -2.4, 0.9), (2.6, 11.5, -1.0, 0.7), (4.0, 10.0, -3.0, 1.1)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    env.floating_islet((x, y, z), s, top='grass')
    sakura(x, y, z + 0.12, 0.4 * s)
# 花瓣
for i in range(36):
    a = i / 36 * math.tau
    r = 4.5 + (i % 4) * 0.9
    kit.ico('petal', 0.05, (math.cos(a) * r, math.sin(a) * r, -1 + (i * 7 % 11) * 0.45), 'petal', sub=0, scale=(1.4, 1, 0.3), group='Spin0')
# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
env.cradle(FLOOR, 'mound', mats=('rock', 'grass'), stair_mat='concrete', seed=5)
# 鏡頭環繞淨空：會擋住自動環繞視線的物件推到環繞圈外
env.clear_orbit()
kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Spin0', 'petals'), 'Spin0', (0, 0, 0))
kit.export(OUT)
