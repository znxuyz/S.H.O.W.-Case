"""
《教室借用系統》3D 環境：晴空下的校園山谷
· 浮島下方的谷地有操場跑道與司令台（學校的延伸）
· 四周山丘上散落小鎮房屋與樹林；幾座小浮島環繞主島
· 立體雲朵；一顆熱氣球緩緩漂浮（Bob）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_hcrs.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('cloud', srgb('#ffffff'), rough=1.0)
material('track', srgb('#d9734f'), rough=0.95)
material('field', srgb('#6fb35a'), rough=1.0)
material('lane', srgb('#f4efe4'), rough=0.9)
material('wall', srgb('#f6f1e7'), rough=0.85)
material('roof_r', srgb('#d1584f'), rough=0.6)
material('roof_b', srgb('#3563e9'), rough=0.6)
material('roof_o', srgb('#e2894b'), rough=0.6)
material('window', srgb('#a9cdf0'), rough=0.2)
material('balloon_a', srgb('#ff6b6b'), rough=0.5)
material('balloon_b', srgb('#ffd35a'), rough=0.5)
material('basket', srgb('#8a5a2e'), rough=0.8)

G = 'env'
terr_floor = -7.6


def flat(X, Y):
    # 操場區域壓平
    return ((X / 7.5) ** 2 + (Y / 4.8) ** 2 < 1).astype(float)


_, grid = env.terrain('valley', radius=72, res=88, floor_z=terr_floor, rim_h=9, valley_r=13, rough=2.6, seed=4,
                      palette=((0.0, '#5a9a4c'), (0.4, '#79b158'), (0.7, '#97c46a'), (1.0, '#b8c98a')), flatten=flat,
                      patches=[('#d8c27a', 0.66), ('#3f7a3c', 0.68)])

# ── 谷底操場（主島正下方） ──
z0 = terr_floor - 0.15
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=0.06, location=(0, 0, z0))
o = bpy.context.active_object
o.scale = (7.0, 4.4, 1)
bpy.ops.object.transform_apply(scale=True)
kit.finalize(o, 'track', G)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=0.08, location=(0, 0, z0 + 0.01))
o = bpy.context.active_object
o.scale = (5.6, 3.0, 1)
bpy.ops.object.transform_apply(scale=True)
kit.finalize(o, 'field', G)
for k in (6.0, 6.5):
    kit.torus('lane', 1, 0.012, (0, 0, z0 + 0.04), 'lane', group=G, major=64, minor=4).scale = (k, k * 0.68, 1)
box('stage', (2.4, 1.0, 0.5), (0, 6.0, z0 + 0.25), 'wall', group=G, bevel=0.03)
cone('stage_roof', 1.6, 0.0, 0.5, (0, 6.0, z0 + 0.8), 'roof_b', verts=4, rot=(0, 0, math.pi / 4), group=G)
for x in (-4.5, 4.5):
    cyl('goal', 0.04, 1.0, (x, 0, z0 + 0.5), 'lane', group=G, verts=6)

# ── 山丘小鎮 ──
ROOFS = ['roof_r', 'roof_b', 'roof_o']
for i, (x, y, z) in enumerate(env.scatter(grid, 26, 22, 44, seed=11)):
    w, d, h = 1.0 + (i % 3) * 0.3, 0.8 + (i % 2) * 0.3, 0.7 + (i % 4) * 0.2
    ang = math.atan2(y, x)
    box('house', (w, d, h), (x, y, z + h / 2), 'wall', rot=(0, 0, ang), group=G, bevel=0.04)
    cone('house_roof', max(w, d) * 0.78, 0.0, 0.5, (x, y, z + h + 0.24), ROOFS[i % 3], verts=4, rot=(0, 0, ang + math.pi / 4), group=G)
    box('house_win', (w * 0.5, 0.02, h * 0.3), (x - math.sin(ang) * 0.0, y, z + h * 0.55), 'window', rot=(0, 0, ang), group=G, bevel=0)
# ── 樹林 ──
for i, (x, y, z) in enumerate(env.scatter(grid, 48, 12, 46, seed=21)):
    kit.tree((x, y, z), s=1.1 + (i % 5) * 0.25, kind='pine' if i % 3 == 0 else 'round', group=G, detail=1 if i % 4 else 0)
# ── 環繞小浮島 ──
for i, (a, r, z, s) in enumerate([(0.6, 10.5, -2.6, 1.0), (2.4, 12.0, -1.2, 0.8), (3.9, 10.0, -3.4, 1.2), (5.2, 12.5, -0.8, 0.7)]):
    x, y = math.cos(a) * r, math.sin(a) * r
    env.floating_islet((x, y, z), s, top='grass')
    kit.tree((x, y, z + 0.12), s=0.55 * s, group=G)
# ── 立體雲 ──
for i in range(10):
    a = i / 10 * math.tau + 0.3
    r = 22 + (i % 3) * 6
    env.cloud((math.cos(a) * r, math.sin(a) * r, 7 + (i % 4) * 1.6), s=1.6 + (i % 3) * 0.5)
# ── 熱氣球（Bob） ──
BX, BY, BZ = -8, 7, 5
kit.sphere('balloon', 1.0, (BX, BY, BZ), 'balloon_a', seg=16, rings=12, scale=(1, 1, 1.2), group='Bob0')
for k in range(4):
    a = k * math.pi / 2
    kit.beam('balloon_rope', (BX + math.cos(a) * 0.5, BY + math.sin(a) * 0.5, BZ - 1.0), (BX + math.cos(a) * 0.22, BY + math.sin(a) * 0.22, BZ - 1.8), 0.02, 'basket', group='Bob0')
box('basket', (0.5, 0.5, 0.4), (BX, BY, BZ - 2.0), 'basket', group='Bob0', bevel=0.04)
kit.torus('balloon_band', 0.95, 0.06, (BX, BY, BZ - 0.1), 'balloon_b', group='Bob0', major=32, minor=6)

kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Bob0', 'balloon'), 'Bob0', (BX, BY, BZ))
kit.export(OUT)
