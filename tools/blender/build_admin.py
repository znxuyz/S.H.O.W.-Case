"""
《行政工作進度追蹤》—— 讓每一件行政工作，都不再被遺忘

專案核心：計畫拆成步驟，走過「計畫 → 核定 → 執行 → 結案」四個階段；
          逾期與久未更新的工作被自動標示；主任一眼看清處室全貌。
主角：辦公桌上的「公文鐵道」——
      · 一條環狀鐵軌，四座小車站：計畫 / 核定 / 執行 / 結案
      · 一列公文小火車（Spin）載著卷宗繞行各站
      · 停在「核定」站前的紅色信號燈與卡關的公文箱＝公文卡關 / 逾期提醒（Pulse）
      · 中央是主任的總覽塔（看板上的四色進度條）
      · 桌面道具：印章、檔案夾、鋼筆、月曆
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'admin.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()

ORANGE = '#d9622b'
STAGES = [('計畫', '#4f86f7'), ('核定', '#f29b30'), ('執行', '#36b37e'), ('結案', '#9b6ce0')]


def tex_desk():
    W = 512
    y = np.linspace(0, 1, W)[None, :]
    grain = kit.noise(W, 3, 4, 71)
    stripes = np.sin((y * 40 + grain * 5) * math.pi) * 0.5 + 0.5
    arr = kit.tint(np.clip(stripes * 0.45 + grain * 0.55, 0, 1), (120, 78, 44), (176, 122, 74))
    return save('desk', np.broadcast_to(arr, (W, W, 3)).copy())


def tex_overview():
    W, H = 420, 300
    img = Image.new('RGB', (W, H), (252, 250, 244))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(kit.CJK_FONT, 34)
    d.rectangle([0, 0, W, 58], fill=kit.hexrgb(ORANGE))
    d.text((20, 8), '處室總覽', font=f, fill=(255, 255, 255))
    for i, (lab, col) in enumerate(STAGES):
        y = 80 + i * 52
        d.text((20, y), lab, font=ImageFont.truetype(kit.CJK_FONT, 28), fill=(60, 60, 70))
        d.rounded_rectangle([100, y + 6, 390, y + 30], radius=10, fill=(230, 226, 216))
        d.rounded_rectangle([100, y + 6, 100 + [240, 150, 200, 110][i], y + 30], radius=10, fill=kit.hexrgb(col))
    return save('overview', np.asarray(img))


def tex_calendar():
    W, H = 240, 260
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 60], fill=(200, 60, 50))
    d.text((70, 6), '11月', font=ImageFont.truetype(kit.CJK_FONT, 42), fill=(255, 255, 255))
    d.text((60, 80), '15', font=ImageFont.truetype(kit.CJK_FONT, 130), fill=(40, 40, 50))
    return save('calendar', np.asarray(img))


material('desk', rough=0.55, tex=tex_desk())
material('desk_dark', srgb('#5a3a22'), rough=0.7)
material('felt', srgb('#2f5a44'), rough=1.0)
material('rail', srgb('#a7b0ba'), rough=0.3, metal=0.9)
material('sleeper', srgb('#6b4a32'), rough=0.85)
material('ballast', srgb('#b8ae9c'), rough=1.0)
material('white', srgb('#fbf8f2'), rough=0.6)
material('engine', srgb(ORANGE), rough=0.4, metal=0.2)
material('engine_dark', srgb('#2a2c33'), rough=0.5, metal=0.5)
material('folder_b', srgb('#4f86f7'), rough=0.6)
material('folder_y', srgb('#f2c230'), rough=0.6)
material('folder_g', srgb('#36b37e'), rough=0.6)
material('paper', srgb('#fffaf0'), rough=0.9)
material('signal_red', srgb('#ff3a2a'), emit=srgb('#ff2a1a'), emit_strength=6)
material('signal_green', srgb('#3aff8a'), emit=srgb('#2aff7a'), emit_strength=3)
material('lamp', srgb('#ffe7a8'), emit=srgb('#ffd27a'), emit_strength=4)
material('stamp_red', srgb('#c0392b'), rough=0.5)
material('pen', srgb('#1f2430'), rough=0.3, metal=0.6)
material('gold', srgb('#e8c872'), rough=0.3, metal=0.9)
material('overview', rough=0.7, tex=tex_overview())
material('calendar', rough=0.7, tex=tex_calendar())
for i, (lab, col) in enumerate(STAGES):
    material(f'stage_{i}', srgb(col), rough=0.5)
    material(f'sign_{i}', rough=0.5, tex=kit.label_texture(f'st{i}', lab, col, size=(220, 110), font_size=64))
material('late', rough=0.6, tex=kit.label_texture('late', '逾期 2 天', '#ff3a2a', size=(240, 90), font_size=48))

# ── 桌面地塊 ──
kit.plinth('desk', soil_mat='desk_dark', rock_mat='desk_dark', rim_mat='desk_dark')
box('felt_mat', (3.3, 3.3, 0.02), (0, 0, 0.01), 'felt', bevel=0.01)

# ── 環狀公文鐵道 ──
RX = RY = 1.18  # 圓形軌道（火車以中心為軸繞行）
N = 64
pts = [(math.cos(i / N * math.tau) * RX, math.sin(i / N * math.tau) * RY) for i in range(N)]
for i in range(N):
    (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % N]
    ang = math.atan2(y1 - y0, x1 - x0)
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    seg = math.hypot(x1 - x0, y1 - y0)
    box('ballast', (seg + 0.01, 0.3, 0.04), (mx, my, 0.04), 'ballast', rot=(0, 0, ang), bevel=0)
    if i % 2 == 0:
        box('sleeper', (0.05, 0.26, 0.025), (mx, my, 0.07), 'sleeper', rot=(0, 0, ang), bevel=0)
    for side in (-0.08, 0.08):
        nx, ny = -math.sin(ang) * side, math.cos(ang) * side
        box('rail', (seg + 0.01, 0.018, 0.025), (mx + nx, my + ny, 0.095), 'rail', rot=(0, 0, ang), bevel=0)

# ── 四座車站 ──
STATION_ANG = [math.radians(a) for a in (200, 290, 20, 110)]
for i, (a, (lab, col)) in enumerate(zip(STATION_ANG, STAGES)):
    x, y = math.cos(a) * (RX + 0.42), math.sin(a) * (RY + 0.42)
    face = a + math.pi / 2
    box('platform', (0.62, 0.3, 0.1), (x, y, 0.06), 'white', rot=(0, 0, face), bevel=0.01)
    box('station', (0.42, 0.24, 0.28), (x + math.cos(a) * 0.1, y + math.sin(a) * 0.1, 0.25), f'stage_{i}', rot=(0, 0, face), bevel=0.015)
    cone('station_roof', 0.36, 0.0, 0.18, (x + math.cos(a) * 0.1, y + math.sin(a) * 0.1, 0.48), 'white', verts=4, rot=(0, 0, face + math.pi / 4))
    for s in (-0.22, 0.22):
        cyl('sign_post', 0.012, 0.42, (x + math.cos(face) * s, y + math.sin(face) * s, 0.31), 'pen', verts=6)
    label_block(f'station_sign_{i}', (0.46, 0.02, 0.22), (x, y, 0.66), f'sign_{i}', bevel=0.004, face='front', group=f'Billboard{1 + i}')
    kit.sphere('station_lamp', 0.035, (x - math.cos(a) * 0.12, y - math.sin(a) * 0.12, 0.42), 'lamp', seg=10, rings=6)

# 「核定」站前卡關：紅燈 + 逾期公文箱
a = STATION_ANG[1] - 0.32
sx, sy = math.cos(a) * (RX - 0.32), math.sin(a) * (RY - 0.32)
cyl('signal_pole', 0.02, 0.6, (sx, sy, 0.3), 'pen', verts=8)
box('signal_head', (0.1, 0.08, 0.2), (sx, sy, 0.62), 'engine_dark', bevel=0.01)
kit.sphere('signal_red', 0.035, (sx, sy - 0.045, 0.67), 'signal_red', seg=12, rings=8, group='Pulse0')
kit.sphere('signal_g', 0.03, (sx, sy - 0.045, 0.58), 'engine_dark', seg=10, rings=6)
box('stuck_box', (0.26, 0.2, 0.16), (sx + 0.32, sy + 0.05, 0.12), 'paper', rot=(0, 0, 0.3), bevel=0.01)
label_block('late_tag', (0.22, 0.01, 0.08), (sx + 0.3, sy - 0.06, 0.23), 'late', bevel=0.002, face='front', rot=(0, 0, 0.3), group='Pulse0')

# ── 公文小火車（沿軌道繞行） ──
T0 = math.radians(330)


def on_track(t, dz):
    return math.cos(t) * RX, math.sin(t) * RY, dz


def tangent(t):
    return math.atan2(math.cos(t) * RY, -math.sin(t) * RX)


cars = [('engine', T0), ('car_b', T0 - 0.42), ('car_y', T0 - 0.8), ('car_g', T0 - 1.18)]
for name, t in cars:
    x, y, _ = on_track(t, 0)
    ang = tangent(t)
    if name == 'engine':
        box('eng_body', (0.36, 0.2, 0.16), (x, y, 0.2), 'engine', rot=(0, 0, ang), bevel=0.02, group='Spin0')
        box('eng_cab', (0.14, 0.2, 0.14), (x - math.cos(ang) * 0.12, y - math.sin(ang) * 0.12, 0.33), 'engine', rot=(0, 0, ang), bevel=0.015, group='Spin0')
        cyl('eng_stack', 0.035, 0.12, (x + math.cos(ang) * 0.12, y + math.sin(ang) * 0.12, 0.34), 'engine_dark', verts=10, group='Spin0')
        kit.sphere('eng_light', 0.03, (x + math.cos(ang) * 0.19, y + math.sin(ang) * 0.19, 0.22), 'lamp', seg=10, rings=6, group='Spin0')
    else:
        col = {'car_b': 'folder_b', 'car_y': 'folder_y', 'car_g': 'folder_g'}[name]
        box(f'{name}_bed', (0.3, 0.2, 0.06), (x, y, 0.15), 'engine_dark', rot=(0, 0, ang), bevel=0.01, group='Spin0')
        for k in range(3):
            box(f'{name}_doc', (0.24, 0.16, 0.03), (x, y, 0.2 + k * 0.035), col if k == 2 else 'paper', rot=(0, 0, ang + (k - 1) * 0.06), bevel=0.004, group='Spin0')
    for s in (-0.1, 0.1):
        cyl('wheel', 0.04, 0.22, (x + math.cos(ang) * s, y + math.sin(ang) * s, 0.13), 'engine_dark', rot=(math.pi / 2, 0, ang), verts=12, group='Spin0')

# ── 中央：主任的總覽塔 ──
box('tower_base', (0.5, 0.5, 0.1), (0, 0, 0.07), 'white', bevel=0.012)
box('tower', (0.32, 0.32, 0.9), (0, 0, 0.57), 'white', bevel=0.02)
for k in range(3):
    box('tower_window', (0.2, 0.02, 0.1), (0, -0.165, 0.42 + k * 0.2), 'lamp', bevel=0)
label_block('overview_board', (0.84, 0.03, 0.6), (0, -0.02, 1.38), 'overview', bevel=0.008, face='front', group='Billboard0')
box('overview_back', (0.88, 0.02, 0.64), (0, 0.01, 1.38), 'engine', bevel=0.006, group='Billboard0')

# ── 桌面道具 ──
box('folder_stack_1', (0.5, 0.36, 0.04), (-1.5, 1.45, 0.05), 'folder_b', rot=(0, 0, 0.2), bevel=0.006)
box('folder_stack_2', (0.5, 0.36, 0.04), (-1.48, 1.43, 0.09), 'folder_y', rot=(0, 0, 0.05), bevel=0.006)
box('folder_stack_3', (0.5, 0.36, 0.04), (-1.5, 1.46, 0.13), 'folder_g', rot=(0, 0, -0.1), bevel=0.006)
cyl('stamp_base', 0.09, 0.08, (1.55, -1.5, 0.06), 'stamp_red', verts=16, bevel=0.01)
cyl('stamp_handle', 0.04, 0.18, (1.55, -1.5, 0.19), 'desk_dark', verts=12)
kit.sphere('stamp_knob', 0.06, (1.55, -1.5, 0.3), 'desk_dark', seg=12, rings=8)
beam('pen_body', (-1.65, -1.2, 0.04), (-0.95, -1.65, 0.04), 0.05, 'pen', round_=True)
beam('pen_clip', (-1.6, -1.22, 0.07), (-1.35, -1.38, 0.07), 0.012, 'gold')
box('calendar_back', (0.4, 0.04, 0.44), (1.5, 1.5, 0.22), 'engine_dark', rot=(0.25, 0, -0.5), bevel=0.01)
label_block('calendar', (0.38, 0.02, 0.42), (1.48, 1.47, 0.23), 'calendar', bevel=0.004, face='front', rot=(0.25, 0, -0.5))
for (x, y, s) in [(1.72, 0.2, 0.42), (-1.75, -0.2, 0.38)]:
    cyl('pot', 0.12 * s / 0.4, 0.18 * s / 0.4, (x, y, 0.09 * s / 0.4), 'stamp_red', verts=14)
    kit.tree((x, y, 0.14), s=s, kind='round')

# ── 細節：搜尋放大鏡、成員識別證架、結案檔案櫃、行事曆便利貼 ──
kit.detail_materials()
material('lens', srgb('#bfe6ff'), rough=0.05, alpha=0.4)
material('cabinet', srgb('#9aa3ad'), rough=0.4, metal=0.6)
material('note_y', srgb('#ffe27a'), rough=0.8)
material('note_p', srgb('#ff9ec4'), rough=0.8)
material('badge', rough=0.6, tex=kit.label_texture('badge', '成員', '#d9622b', size=(140, 190), font_size=52))
# 放大鏡（環內）
MGX, MGY = 0.55, 0.5
kit.torus('magnifier_rim', 0.17, 0.025, (MGX, MGY, 0.06), 'pen', rot=(0.15, 0, 0), major=32, minor=8, group='Fx_mag')
cyl('magnifier_lens', 0.16, 0.012, (MGX, MGY, 0.06), 'lens', verts=24, rot=(0.15, 0, 0), group='Fx_mag')
kit.beam('magnifier_handle', (MGX + 0.17, MGY - 0.12, 0.05), (MGX + 0.42, MGY - 0.32, 0.04), 0.045, 'desk_dark', round_=True, group='Fx_mag')
# 成員識別證架（環內）
BGX, BGY = -0.58, -0.55
box('badge_stand', (0.36, 0.08, 0.04), (BGX, BGY, 0.02), 'pen', bevel=0.006)
for k in range(3):
    kit.beam('lanyard', (BGX - 0.12 + k * 0.12, BGY, 0.32), (BGX - 0.12 + k * 0.12, BGY, 0.24), 0.008, 'engine', round_=True)
    kit.label_block(f'badge_{k}', (0.09, 0.012, 0.12), (BGX - 0.12 + k * 0.12, BGY - 0.01, 0.17), 'badge', bevel=0.003, face='front', group=f'Fx_badge{k}')
box('badge_bar', (0.36, 0.02, 0.02), (BGX, BGY, 0.33), 'pen', bevel=0)
for dx in (-0.17, 0.17):
    cyl('badge_post', 0.01, 0.32, (BGX + dx, BGY, 0.17), 'pen', verts=6)
# 結案檔案櫃（結案站旁）
CBX, CBY = -1.15, 1.72
box('cabinet', (0.42, 0.3, 0.5), (CBX, CBY, 0.25), 'cabinet', bevel=0.012)
for k in range(3):
    box('drawer', (0.36, 0.02, 0.13), (CBX, CBY - 0.16, 0.09 + k * 0.16), 'white', bevel=0.004)
    box('drawer_handle', (0.1, 0.02, 0.02), (CBX, CBY - 0.175, 0.1 + k * 0.16), 'pen', bevel=0)
box('drawer_open', (0.36, 0.2, 0.12), (CBX, CBY - 0.27, 0.41), 'cabinet', bevel=0.006, group='Fx_drawer')
for k in range(4):
    box('filed_folder', (0.3, 0.012, 0.16), (CBX, CBY - 0.2 - k * 0.04, 0.47), ['folder_b', 'folder_y', 'folder_g', 'folder_b'][k], bevel=0, group='Fx_drawer')
# 行事曆便利貼（各自獨立，點擊時像被翻動般擺動）
STICKY = []
for k, (dx, dz, m) in enumerate([(-0.12, 0.06, 'note_y'), (0.1, -0.06, 'note_p'), (0.0, -0.14, 'note_y')]):
    box('sticky', (0.09, 0.01, 0.09), (1.48 + dx * 0.9, 1.44 + dx * 0.4, 0.26 + dz), m, rot=(0.25, 0, -0.5 + k * 0.1), bevel=0, group=f'Fx_sticky{k}')
    STICKY.append((1.48 + dx * 0.9, 1.44 + dx * 0.4, 0.26 + dz + 0.045))

# ── 點擊動畫節點（熱點附近的零件抽出成 Fx_ 節點） ──
kit.fx_node('Fx_mag', (MGX, MGY, 0.06))
for k in range(3):
    kit.fx_node(f'Fx_badge{k}', (BGX - 0.12 + k * 0.12, BGY - 0.01, 0.24))
kit.fx_node('Fx_drawer', (CBX, CBY - 0.27, 0.41))
for k, p in enumerate(STICKY):
    kit.fx_node(f'Fx_sticky{k}', p)
# 行事曆：沿上緣往後翻的一張月曆紙（樞紐與月曆同樣傾斜，平常隱藏）
piv = bpy.data.objects.new('FxHide_calpage', None)
bpy.context.scene.collection.objects.link(piv)
piv.location = (1.48, 1.462, 0.44)
piv.rotation_euler = (0.25, 0, -0.5)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
leaf = bpy.context.active_object
leaf.scale = (0.37, 0.006, 0.41)
bpy.ops.object.transform_apply(scale=True)
for v in leaf.data.vertices:
    v.co.z -= 0.205
leaf.name = 'cal_leaf'
leaf.data.materials.append(kit.MATS['calendar'])
leaf.parent = piv
# 卡關站：平時豎起、點擊時放下橫擋軌道的柵欄桿
material('gate_stripe', rough=0.6, tex=kit.label_texture('gate', '■□■□■□', '#ffffff', fg=(220, 60, 60), size=(300, 40), font_size=34, border=False))
GTX, GTY = sx - 0.18, sy + 0.12
cyl('gate_post', 0.025, 0.3, (GTX, GTY, 0.15), 'pen', verts=8)
box('gate_arm', (0.03, 0.03, 0.6), (GTX, GTY, 0.6), 'gate_stripe', bevel=0.004, group='Fx_gate')
kit.fx_node('Fx_gate', (GTX, GTY, 0.3))
# 處室總覽板：兩側隱藏的延伸面板（點擊時展開）
for side in (-1, 1):
    label_block(f'ov_side_{side}', (0.38, 0.02, 0.5), (side * 0.66, -0.02, 1.38), 'overview', bevel=0.006, face='front', group='FxHide_ov' + ('L' if side < 0 else 'R'))
# 火車煙囪的蒸汽（平常隱藏）
material('steam', srgb('#ffffff'), rough=1.0)
ex, ey, _ = on_track(T0, 0)
ang0 = tangent(T0)
for k in range(3):
    kit.ico('steam', 0.05 + k * 0.025, (ex + math.cos(ang0) * 0.12, ey + math.sin(ang0) * 0.12, 0.46 + k * 0.1), 'steam', sub=1, group='FxHide_steam')

# ── 合併、樞紐、匯出 ──
# 精緻度升級：建築腰線／簷口，與依主題自動布置的微縮生活小道具（共用網格）
kit.articulate()
kit.dress('desk', 12, seed=35)
kit.merge_group('static', 'desk')
sp = kit.pivot(kit.merge_group('Spin0', 'train'), 'Spin0', (0, 0, 0))
kit.reparent(kit.fx_node('FxHide_steam', (ex + math.cos(ang0) * 0.12, ey + math.sin(ang0) * 0.12, 0.4)), sp)
kit.pivot(kit.merge_group('Pulse0', 'stuck'), 'Pulse0', (sx, sy - 0.045, 0.67))
ov = kit.pivot(kit.merge_group('Billboard0', 'overview'), 'Billboard0', (0, 0, 1.38))
kit.reparent(kit.fx_node('FxHide_ovL', (-0.45, -0.02, 1.38)), ov)
kit.reparent(kit.fx_node('FxHide_ovR', (0.45, -0.02, 1.38)), ov)
for i, a in enumerate(STATION_ANG):
    kit.pivot(kit.merge_group(f'Billboard{1 + i}', f'sign{i}'), f'Billboard{1 + i}', (math.cos(a) * (RX + 0.42), math.sin(a) * (RY + 0.42), 0.66))
kit.export(OUT)
