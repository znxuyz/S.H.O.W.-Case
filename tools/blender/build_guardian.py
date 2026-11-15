"""
《守護獸學園》—— 從蛋到守護神獸

專案核心：學生每次表現好，就能餵養自己的台灣特有種守護獸，從蛋孵化成守護神獸（4 階段）。
主角：森林空地上的「進化之路」——四座逐級升高的發光石台，依序站著
      台灣黑熊的 蛋 → 幼獸 → 成獸 → 守護神獸（使用專案原創插畫，永遠面向鏡頭 Billboard）。
      守護神獸頭上有靈光與光環；石虎、藍鵲、帝雉等夥伴散在林間。
地景：千年巨木樹屋教室（黑板、燈籠）、發光蘑菇、螢火蟲、踏石小徑。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import beam, box, cone, cyl, ico, label_block, material, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'guardian.glb'
PETS = os.environ.get('PETS_DIR', '/home/user/znxuyz/classroommanagementsystem2.0/assets/pets')
kit.reset()
kit.standard_materials()
kit.nature_materials()

material('forest_floor', rough=1.0, tex=save('forest', kit.tint(kit.noise(512, 9, 5, 41), (46, 110, 64), (92, 156, 88))))
material('mossy_stone', srgb('#8f9a8c'), rough=0.9)
material('stone_light', srgb('#b9c2b4'), rough=0.85)
material('gold', srgb('#e8c872'), rough=0.3, metal=0.9)
material('rune', srgb('#9effc9'), emit=srgb('#7dffc0'), emit_strength=3.5)
material('spirit', srgb('#d8fff0'), emit=srgb('#9effc9'), emit_strength=6)
material('firefly', srgb('#f4ffb0'), emit=srgb('#e6ff8a'), emit_strength=8)
material('lamp', srgb('#ffd27a'), emit=srgb('#ffbf5a'), emit_strength=5)
material('wood_light', srgb('#c98a4b'), rough=0.8)
material('roof_red', srgb('#d1584f'), rough=0.6)
material('board_green', srgb('#2f5a44'), rough=0.9)
material('mush_cyan', srgb('#5ef0ff'), emit=srgb('#3fd8ff'), emit_strength=2.5)
material('mush_pink', srgb('#ff8ad8'), emit=srgb('#ff6ac8'), emit_strength=2.5)
material('stem', srgb('#eef4ea'), rough=0.8)
material('flower_y', srgb('#ffd35a'), rough=0.7)
material('flower_w', srgb('#ffffff'), rough=0.7)
material('chalk', rough=0.9, tex=kit.label_texture('chalk', '今日任務\n照顧守護獸', '#2f5a44', fg=(240, 246, 236), size=(320, 220), font_size=46, border=False))

kit.plinth('forest_floor', soil_mat='soil', rock_mat='rock', rim_mat='mossy_stone')

# ── 千年巨木與樹屋教室（後方） ──
TX, TY = -0.25, 1.05
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.42, radius2=0.26, depth=2.2, location=(TX, TY, 1.1))
trunk = bpy.context.active_object
for v in trunk.data.vertices:
    v.co.x *= 0.9 + kit.rng.random() * 0.2
    v.co.y *= 0.9 + kit.rng.random() * 0.2
kit.finalize(trunk, 'bark', bevel=0.02)
for a in range(6):
    ang = a / 6 * math.tau
    beam('root', (TX + math.cos(ang) * 0.25, TY + math.sin(ang) * 0.25, 0.25), (TX + math.cos(ang) * 0.75, TY + math.sin(ang) * 0.75, 0.0), 0.12, 'bark')
box('deck', (1.6, 1.3, 0.08), (TX, TY - 0.1, 1.5), 'wood_light', bevel=0.012)
for dx in (-0.72, 0.72):
    beam('deck_post', (TX + dx, TY - 0.7, 0), (TX + dx, TY - 0.7, 1.5), 0.06, 'bark')
box('house', (1.0, 0.7, 0.6), (TX + 0.05, TY + 0.05, 1.84), 'wood_light', bevel=0.02)
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.62, depth=1.2, location=(TX + 0.05, TY + 0.05, 2.28), rotation=(0, math.pi / 2, 0))
roof = bpy.context.active_object
roof.rotation_euler = (math.pi / 2, 0, math.pi / 2)
roof.scale = (1, 0.62, 1)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
kit.finalize(roof, 'roof_red', bevel=0.02)
for dx in (-0.25, 0.25):
    box('house_window', (0.2, 0.02, 0.2), (TX + 0.05 + dx, TY - 0.31, 1.88), 'lamp', bevel=0)
label_block('blackboard', (0.62, 0.03, 0.42), (TX + 0.05, TY - 0.72, 1.82), 'chalk', bevel=0.006, face='front')
box('board_frame', (0.68, 0.025, 0.48), (TX + 0.05, TY - 0.705, 1.82), 'wood_light', bevel=0.004)
for (dx, dy, dz, r, m) in [(-0.7, 0.2, 2.75, 0.75, 'leaf_dark'), (0.6, 0.1, 2.7, 0.7, 'leaf'), (0.0, 0.45, 3.1, 0.85, 'leaf'),
                           (-0.35, -0.2, 3.2, 0.55, 'leaf_dark'), (0.45, -0.25, 3.15, 0.5, 'leaf'), (0.05, 0.1, 3.55, 0.55, 'leaf_dark'),
                           (-0.95, 0.5, 2.35, 0.45, 'leaf'), (0.95, 0.55, 2.4, 0.45, 'leaf_dark')]:
    ico('canopy', r, (TX + dx, TY + dy, dz), m, sub=2)
for (dx, dz) in [(-0.85, 2.25), (0.85, 2.2), (-0.4, 2.45)]:
    beam('lamp_cord', (TX + dx, TY - 0.45, dz + 0.2), (TX + dx, TY - 0.45, dz + 0.08), 0.01, 'bark', round_=True)
    kit.sphere('lantern', 0.07, (TX + dx, TY - 0.45, dz), 'lamp', seg=12, rings=8)

# ── 進化之路：四座石台與角色看板 ──
STAGES = [('bear-egg.png', 0.55), ('bear-baby.png', 0.72), ('bear-adult.png', 0.92), ('bear-guardian.png', 1.2)]
SPOTS = [(-1.4, -1.05, 0.14), (-0.5, -1.38, 0.28), (0.45, -1.38, 0.42), (1.35, -1.0, 0.6)]
for i, ((img, h), (x, y, ph)) in enumerate(zip(STAGES, SPOTS)):
    cyl('pedestal', 0.34, ph, (x, y, ph / 2), 'stone_light', verts=20, bevel=0.02)
    cyl('pedestal_cap', 0.38, 0.06, (x, y, ph + 0.03), 'mossy_stone', verts=20, bevel=0.01)
    kit.torus('pedestal_ring', 0.33, 0.014, (x, y, ph + 0.065), 'rune', major=40, minor=6)
    kit.image_card(f'stage_{i}', os.path.join(PETS, img), h, (x, y, ph + 0.06 + h / 2), group=f'Billboard{i}')
for a, b in zip(SPOTS, SPOTS[1:]):
    for t in (0.35, 0.65):
        x = a[0] + (b[0] - a[0]) * t
        y = a[1] + (b[1] - a[1]) * t
        cone('evolve_arrow', 0.06, 0.0, 0.12, (x, y, 0.06), 'rune', verts=3, rot=(0, math.pi / 2, math.atan2(b[1] - a[1], b[0] - a[0])))
# 守護神獸頭上的靈光
GX, GY, GZ = SPOTS[3][0], SPOTS[3][1], SPOTS[3][2] + 1.5
kit.sphere('spirit_orb', 0.13, (GX, GY, GZ), 'spirit', seg=20, rings=12, group='Bob_0')
kit.torus('spirit_ring', 0.32, 0.012, (GX, GY, GZ), 'gold', rot=(1.1, 0, 0), group='Spin_0', major=40, minor=6)

# 林間夥伴（其他守護獸）
for i, (img, h, x, y) in enumerate([('cat-guardian.png', 0.6, 1.55, 0.55), ('magpie-guardian.png', 0.62, -1.62, 0.15), ('pheasant-guardian.png', 0.58, 0.9, 1.6)]):
    cyl('friend_base', 0.2, 0.06, (x, y, 0.03), 'mossy_stone', verts=14)
    kit.image_card(f'friend_{i}', os.path.join(PETS, img), h, (x, y, 0.06 + h / 2), group=f'Billboard{i + 4}')

# 踏石小徑、蘑菇、花、樹叢
for i in range(7):
    t = i / 6
    x, y = -0.2 + math.sin(t * 2.4) * 0.3, -1.75 + t * 1.4
    cyl('step_stone', 0.11 + 0.02 * (i % 2), 0.04, (x, y, 0.02), 'stone_light', verts=10, bevel=0.01)
for (x, y, m, s) in [(1.7, -0.25, 'mush_cyan', 1.0), (1.55, -0.45, 'mush_pink', 0.7), (-1.7, -0.45, 'mush_cyan', 0.8), (-1.25, 0.55, 'mush_pink', 1.1), (0.95, 0.75, 'mush_cyan', 0.75)]:
    cyl('mush_stem', 0.025 * s, 0.14 * s, (x, y, 0.07 * s), 'stem', verts=8)
    kit.sphere('mush_cap', 0.08 * s, (x, y, 0.14 * s), m, seg=14, rings=8, scale=(1, 1, 0.55))
for i in range(22):
    a = kit.rng.random() * math.tau
    r = 1.2 + kit.rng.random() * 0.6
    kit.sphere('flower', 0.025, (math.cos(a) * r, math.sin(a) * r, 0.03), 'flower_y' if i % 2 else 'flower_w', seg=8, rings=6)
for (x, y, s, k) in [(-1.6, 1.55, 0.8, 'pine'), (1.65, 1.5, 0.7, 'round'), (-1.75, -1.65, 0.55, 'round'), (1.75, -1.7, 0.5, 'pine')]:
    kit.tree((x, y, 0), s=s, kind=k)
for (x, y, r) in [(-0.95, 1.65, 0.22), (1.2, 1.1, 0.2), (-1.65, 0.95, 0.24)]:
    ico('bush', r, (x, y, r * 0.6), 'leaf', sub=2, scale=(1, 1, 0.75))

# 螢火蟲（Spin_1）
for i in range(14):
    a = i / 14 * math.tau
    r = 0.9 + (i % 3) * 0.35
    kit.sphere('firefly', 0.025, (TX + math.cos(a) * r, TY - 0.4 + math.sin(a) * r, 0.6 + (i % 5) * 0.35), 'firefly', seg=8, rings=6, group='Spin_1')

# ── 細節：照護站（健康機制）、獎品商店、領地旗、餵食碗、招牌 ──
kit.detail_materials()
material('tent', srgb('#fffaf0'), rough=0.85)
material('cross', srgb('#ff5a5a'), rough=0.5)
material('stall', srgb('#c98a4b'), rough=0.75)
material('awning_a', srgb('#ff8a6b'), rough=0.6)
material('awning_b', srgb('#fff4e0'), rough=0.6)
material('flag_r', srgb('#ff5a5a'), rough=0.6)
material('flag_b', srgb('#4f86f7'), rough=0.6)
material('flag_y', srgb('#ffd35a'), rough=0.6)
material('bowl', srgb('#7fd6cc'), rough=0.4)
material('food', srgb('#e2a65a'), rough=0.8)
material('sign_board', rough=0.8, tex=kit.label_texture('gsign', '守護獸學園', '#8a5a2e', fg=(255, 240, 200), size=(360, 120), font_size=60))
# 照護站：小帳篷 + 紅十字 + 生病的小石虎（cat-baby）＋愛心
CX, CY = 1.05, 0.25
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.34, depth=0.55, location=(CX, CY, 0.17), rotation=(0, math.pi / 2, 0))
tent = bpy.context.active_object
tent.rotation_euler = (math.pi / 2, 0, 0.3)
bpy.ops.object.transform_apply(rotation=True)
kit.finalize(tent, 'tent', bevel=0.01)
box('cross_v', (0.04, 0.02, 0.14), (CX - 0.05, CY - 0.28, 0.27), 'cross', rot=(0, 0, 0.3), bevel=0)
box('cross_h', (0.14, 0.02, 0.04), (CX - 0.05, CY - 0.28, 0.27), 'cross', rot=(0, 0, 0.3), bevel=0)
kit.image_card('sick_pet', os.path.join(PETS, 'cat-baby.png'), 0.36, (CX - 0.12, CY - 0.42, 0.2), group='Billboard8')
kit.sphere('heart_l', 0.035, (CX - 0.15, CY - 0.45, 0.48), 'cross', seg=10, rings=6, group='Bob1')
kit.sphere('heart_r', 0.035, (CX - 0.09, CY - 0.45, 0.48), 'cross', seg=10, rings=6, group='Bob1')
cone('heart_tip', 0.06, 0.0, 0.07, (CX - 0.12, CY - 0.45, 0.43), 'cross', verts=8, rot=(math.pi, 0, 0), group='Bob1')
# 獎品商店攤
SX2, SY2 = -1.35, -0.35
box('stall_counter', (0.6, 0.3, 0.32), (SX2, SY2, 0.16), 'stall', bevel=0.02)
for dx in (-0.27, 0.27):
    cyl('stall_post', 0.018, 0.5, (SX2 + dx, SY2 + 0.1, 0.57), 'stall', verts=6)
for k in range(6):
    box('awning', (0.11, 0.42, 0.02), (SX2 - 0.275 + k * 0.11, SY2 - 0.02, 0.83), 'awning_a' if k % 2 else 'awning_b', rot=(0.35, 0, 0), bevel=0)
for k, m in enumerate(['flag_r', 'flag_b', 'flag_y', 'bowl']):
    box('prize', (0.09, 0.09, 0.09), (SX2 - 0.2 + k * 0.13, SY2 - 0.02, 0.37), m, rot=(0, 0, k * 0.4), bevel=0.012)
kit.sphere('coin', 0.05, (SX2 + 0.2, SY2 - 0.16, 0.36), 'gold', seg=12, rings=6, scale=(1, 0.3, 1), group='Spin2')
# 領地佔領戰：三色旗插在小丘上
for k, (fx, fy, m) in enumerate([(0.15, 0.35, 'flag_r'), (0.45, 0.6, 'flag_b'), (-0.15, 0.62, 'flag_y')]):
    cyl('flag_pole', 0.012, 0.6, (fx, fy, 0.3), 'stall', verts=6)
    box('flag', (0.2, 0.01, 0.12), (fx + 0.1, fy, 0.53), m, bevel=0)
# 餵食碗
for k, (bx, by) in enumerate([(-0.95, -1.2), (0.0, -1.62), (0.9, -1.55)]):
    cyl('bowl', 0.07, 0.04, (bx, by, 0.02), 'bowl', verts=14)
    kit.sphere('food', 0.055, (bx, by, 0.045), 'food', seg=10, rings=5, scale=(1, 1, 0.45))
# 招牌
cyl('sign_post', 0.025, 0.5, (-1.75, -1.4, 0.25), 'stall', verts=6)
kit.label_block('sign', (0.5, 0.03, 0.17), (-1.62, -1.45, 0.48), 'sign_board', bevel=0.006, face='front', rot=(0, 0, 0.35))

# ── 點擊動畫節點（熱點附近的零件抽出成 Fx_ 節點） ──
kit.fx_around('Fx_class', -0.2, 0.35, r=0.5, z0=1.1, z1=2.4)
kit.fx_around('Fx_shop', -1.35, -0.35, r=0.38, z0=0.03, z1=1.1)
kit.fx_around('Fx_flags', 0.2, 0.5, r=0.3, z0=0.03, z1=1.0)

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'forest')
for i, (x, y, ph) in enumerate(SPOTS):
    kit.pivot(kit.merge_group(f'Billboard{i}', f'stage{i}'), f'Billboard{i}', (x, y, ph + 0.06))
for i, (x, y) in enumerate([(1.55, 0.55), (-1.62, 0.15), (0.9, 1.6)]):
    kit.pivot(kit.merge_group(f'Billboard{i + 4}', f'friend{i}'), f'Billboard{i + 4}', (x, y, 0.06))
kit.pivot(kit.merge_group('Bob_0', 'spirit'), 'Bob_0', (GX, GY, GZ))
kit.pivot(kit.merge_group('Spin_0', 'spiritring'), 'Spin_0', (GX, GY, GZ))
kit.pivot(kit.merge_group('Spin_1', 'fireflies'), 'Spin_1', (TX, TY - 0.4, 0))
kit.pivot(kit.merge_group('Billboard8', 'sickpet'), 'Billboard8', (CX - 0.12, CY - 0.42, 0.02))
kit.pivot(kit.merge_group('Bob1', 'heart'), 'Bob1', (CX - 0.12, CY - 0.45, 0.46))
kit.pivot(kit.merge_group('Spin2', 'coin'), 'Spin2', (SX2 + 0.2, SY2 - 0.16, 0.36))
kit.export(OUT)
