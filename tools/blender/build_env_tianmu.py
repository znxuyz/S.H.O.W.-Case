"""
《天幕島》3D 環境：水墨月夜的喀斯特山水
· 浮島下方是大湖（鏡面水色），四周數十座奇峰拔地而起，峰頂有松
· 半透明霧帶層層橫過群峰；遠峰上有一座塔；天上一輪明月
· 數盞天燈緩緩升降（Bob）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_tianmu.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('water', srgb('#20383c'), rough=0.08, metal=0.4)
material('peak', srgb('#55605a'), rough=0.95)
material('peak_dark', srgb('#3a433f'), rough=0.95)
material('pine', srgb('#2c4a38'), rough=0.9)
material('mist', srgb('#e8e2d0'), rough=1.0, alpha=0.22)
material('moon', srgb('#fff2cf'), emit=srgb('#ffe9b0'), emit_strength=3.5)
material('lantern', srgb('#ffb060'), emit=srgb('#ff9a40'), emit_strength=5)
material('roof', srgb('#2a2f2c'), rough=0.6)
material('red', srgb('#8e2a1c'), rough=0.6)
material('gold', srgb('#e8c872'), rough=0.3, metal=0.9)

G = 'env'
FLOOR = -8.0


def lake(X, Y):
    return ((X / 16) ** 2 + (Y / 12) ** 2 < 1).astype(float)


_, grid = env.terrain('basin', radius=72, res=84, floor_z=FLOOR, rim_h=6, valley_r=15, rough=2.0, seed=8,
                      palette=((0.0, '#3e4a42'), (0.5, '#55634f'), (1.0, '#7b826c')), flatten=lake,
                      patches=[('#6f7458', 0.66), ('#2f3b33', 0.7)])
# 湖面
bpy.ops.mesh.primitive_circle_add(vertices=64, radius=1, fill_type='NGON', location=(0, 0, FLOOR + 0.05))
o = bpy.context.active_object
o.scale = (17, 13, 1)
bpy.ops.object.transform_apply(scale=True)
kit.finalize(o, 'water', G)


def karst(x, y, z, h, r, seed):
    """喀斯特奇峰：上窄下寬、帶扭曲的峰柱 + 圓頂 + 頂上松"""
    rnd = kit.random.Random(seed)
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, radius2=r * 0.45, depth=h, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    lean = (rnd.random() - 0.5) * r * 0.6
    for v in o.data.vertices:
        k = (v.co.z + h / 2) / h
        v.co.x *= 0.85 + rnd.random() * 0.3
        v.co.y *= 0.85 + rnd.random() * 0.3
        v.co.x += k * k * lean
    kit.finalize(o, 'peak' if seed % 3 else 'peak_dark', G)
    kit.sphere('peak_cap', r * 0.5, (x + lean, y, z + h), 'peak', seg=10, rings=6, scale=(1, 1, 0.65), group=G)
    for k in range(2 if h > 8 else 1):
        a = rnd.random() * math.tau
        px, py = x + lean + math.cos(a) * r * 0.25, y + math.sin(a) * r * 0.25
        cone('pine', r * 0.32, 0, r * 0.7, (px, py, z + h + r * 0.35), 'pine', verts=7, group=G)


rnd = kit.random.Random(31)
peaks = []
for i in range(34):
    a = i / 34 * math.tau + rnd.random() * 0.2
    r = 17 + rnd.random() * 32
    x, y = math.cos(a) * r, math.sin(a) * r
    # 鏡頭在 (+x, -y) 方向：那一側近處不放峰，避免擋住主島
    cam_side = -1.9 < math.atan2(y, x) < 0.35
    if cam_side and r < 34:
        continue
    if any(math.hypot(x - px, y - py) < 4.5 for px, py, _ in peaks):
        continue
    h = 6 + rnd.random() * (10 if r < 30 else 16)
    peaks.append((x, y, h))
    karst(x, y, env.height_at(grid, x, y) - 0.5, h, 1.6 + rnd.random() * 1.6, i)
# 近處幾座從湖中拔起的矮峰
for i, (a, r, h) in enumerate([(0.6, 12.5, 5.5), (1.5, 13, 7.5), (2.4, 12, 4.8), (3.2, 13.5, 6.5)]):
    karst(math.cos(a) * r, math.sin(a) * r, FLOOR, h, 1.3, 100 + i)

# 遠峰上的塔
tx, ty, th = peaks[3]
tz = env.height_at(grid, tx, ty) - 0.5 + th + 0.5
for k in range(4):
    s = 1.0 - k * 0.18
    box('tower_floor', (s, s, 0.5), (tx, ty, tz + k * 0.75 + 0.25), 'red', group=G, bevel=0.02)
    cone('tower_roof', s * 0.95, 0.05, 0.3, (tx, ty, tz + k * 0.75 + 0.62), 'roof', verts=4, rot=(0, 0, math.pi / 4), group=G)
cyl('tower_spire', 0.06, 0.7, (tx, ty, tz + 3.4), 'gold', verts=6, group=G)

# 霧帶（半透明薄層，交錯高度）
for i in range(7):
    a = i / 7 * math.tau + 0.4
    r = 20 + (i % 3) * 9
    bpy.ops.mesh.primitive_plane_add(size=1, location=(math.cos(a) * r, math.sin(a) * r, -3 + (i % 3) * 2.2))
    o = bpy.context.active_object
    o.scale = (26, 7, 1)
    o.rotation_euler = (0, 0, a + math.pi / 2)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    kit.finalize(o, 'mist', G)

# 明月
kit.sphere('moon', 4.0, (-24, 40, 22), 'moon', seg=24, rings=14, group=G)

# 天燈（Bob0..3）
for i, (x, y, z) in enumerate([(-11, 6, 3.5), (-6, 12, 6), (8, 13, 5), (13, 4, 2.5), (-14, -3, 4.5), (2, 16, 7)]):
    box('sky_lantern', (0.45, 0.45, 0.62), (x, y, z), 'lantern', group=f'Bob{i}', bevel=0.05)

# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
material('cr_stone', srgb('#8a8f86'), rough=0.9)
material('cr_post', srgb('#6b3a2a'), rough=0.7)
material('cr_gold', srgb('#d8b45a'), rough=0.3, metal=0.9)
env.cradle(FLOOR, 'tiers', mats=('cr_stone', 'cr_post'), accent='cr_gold', stair_mat='cr_stone')
kit.merge_group('env', 'env')
for i, (x, y, z) in enumerate([(-11, 6, 3.5), (-6, 12, 6), (8, 13, 5), (13, 4, 2.5), (-14, -3, 4.5), (2, 16, 7)]):
    kit.pivot(kit.merge_group(f'Bob{i}', f'lantern{i}'), f'Bob{i}', (x, y, z))
kit.export(OUT)
