"""
《守護獸學園》3D 環境：月光下的台灣山林
· 谷底一條溪流穿過；兩岸茂密的松與闊葉林、幾株千年神木
· 遠方層疊的中央山脈稜線（高聳峰群）；發光蘑菇叢點綴林床
· 螢火蟲群環繞（Spin），一輪淡綠色的月
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_guardian.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('river', srgb('#2f6f7a'), rough=0.1, metal=0.3)
material('pine_d', srgb('#1d4a3a'), rough=0.9)
material('pine_l', srgb('#2a6048'), rough=0.9)
material('mountain', srgb('#1f3a3a'), rough=1.0)
material('snowcap', srgb('#cfe6dc'), rough=0.9)
material('moon', srgb('#e8fff2'), emit=srgb('#d8fff0'), emit_strength=3)
material('mush_c', srgb('#5ef0ff'), emit=srgb('#3fd8ff'), emit_strength=3)
material('mush_p', srgb('#ff8ad8'), emit=srgb('#ff6ac8'), emit_strength=3)
material('stem', srgb('#eef4ea'), rough=0.8)
material('firefly', srgb('#f4ffb0'), emit=srgb('#e6ff8a'), emit_strength=9)
G = 'env'
FLOOR = -7.8


def river(X, Y):
    # 一條斜穿谷底的溪
    d = abs(Y - 0.35 * X - 2.0 * __import__('numpy').sin(X / 9))
    return (d < 2.2).astype(float)


_, grid = env.terrain('forest_floor', radius=70, res=84, floor_z=FLOOR, rim_h=10, valley_r=12, rough=3.0, seed=12,
                      palette=((0.0, '#1f4a35'), (0.45, '#2c6345'), (0.8, '#3d7a50'), (1.0, '#4f8a5a')), flatten=river,
                      patches=[('#163a2b', 0.62), ('#4a8a52', 0.7)])
# 溪流（沿著壓平帶的一長條水面）
for k in range(-14, 15):
    x = k * 5.0
    y = 0.35 * x + 2.0 * math.sin(x / 9)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, FLOOR - 0.05))
    o = bpy.context.active_object
    o.scale = (5.6, 3.2, 1)
    o.rotation_euler = (0, 0, math.atan(0.35))
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    kit.finalize(o, 'river', G)

# 遠方中央山脈
for i in range(16):
    a = math.radians(40 + i * 7.5)          # 主要在鏡頭對面（+y 側）
    r = 58 + (i % 3) * 6
    x, y = math.cos(a) * r, math.sin(a) * r
    h = 16 + (i * 37 % 11)
    cone('mountain', 9 + (i % 4) * 2, 0.5, h, (x, y, FLOOR + h / 2 - 1), 'mountain', verts=7, group=G)
    cone('snow', 2.6, 0.2, h * 0.18, (x, y, FLOOR + h - 1 - h * 0.07), 'snowcap', verts=7, group=G)

# 森林：大量針葉 + 闊葉，環帶散佈（避開溪流）
avoid = lambda x, y: abs(y - 0.35 * x - 2.0 * math.sin(x / 9)) < 2.6  # noqa: E731
for i, (x, y, z) in enumerate(env.scatter(grid, 110, 10, 52, seed=33, avoid=avoid)):
    s = 1.4 + (i % 7) * 0.3
    if i % 3:
        for k, (rr, hh, dz) in enumerate([(0.9, 1.4, 1.1), (0.7, 1.2, 1.9), (0.45, 1.0, 2.6)]):
            cone('pine', rr * s, 0.0, hh * s, (x, y, z + dz * s), 'pine_d' if k % 2 == 0 else 'pine_l', verts=6, group=G)
        cyl('trunk', 0.12 * s, 0.8 * s, (x, y, z + 0.4 * s), 'bark', verts=5, group=G)
    else:
        kit.tree((x, y, z), s=s * 1.2, kind='round', leaf='pine_l', leaf2='pine_d', group=G, detail=0)
# 千年神木（環繞主島的幾株巨木）
for i, a in enumerate([0.9, 2.3, 3.4, 4.6]):
    x, y = math.cos(a) * 16, math.sin(a) * 16
    z = env.height_at(grid, x, y)
    kit.beam('giant_trunk', (x, y, z), (x + 0.6, y, z + 12), 1.1, 'bark', group=G)
    for k in range(5):
        kit.ico('giant_crown', 3.2 - k * 0.3, (x + 0.6 + math.cos(k * 1.3) * 2.2, y + math.sin(k * 1.3) * 2.2, z + 12 + (k % 3) * 1.2), 'pine_l' if k % 2 else 'pine_d', sub=1, group=G)
# 發光蘑菇叢
for i, (x, y, z) in enumerate(env.scatter(grid, 26, 9, 24, seed=44, avoid=avoid)):
    for k in range(3):
        dx, dy = (k - 1) * 0.35, (k % 2) * 0.3
        cyl('mush_stem', 0.07, 0.35, (x + dx, y + dy, z + 0.17), 'stem', verts=6, group=G)
        kit.sphere('mush_cap', 0.22, (x + dx, y + dy, z + 0.38), 'mush_c' if (i + k) % 2 else 'mush_p', seg=10, rings=5, scale=(1, 1, 0.5), group=G)
# 月
kit.sphere('moon', 3.0, (-30, 48, 26), 'moon', seg=20, rings=12, group=G)
# 螢火蟲群（Spin0：繞主島）
for i in range(40):
    a = i / 40 * math.tau
    r = 4.2 + (i % 5) * 0.8
    kit.sphere('firefly', 0.045, (math.cos(a) * r, math.sin(a) * r, -3 + (i * 7 % 11) * 0.7), 'firefly', seg=6, rings=4, group='Spin0')

kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Spin0', 'fireflies'), 'Spin0', (0, 0, 0))
kit.export(OUT)
