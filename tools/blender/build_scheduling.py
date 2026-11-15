"""
《國小排課系統》—— 課表排列引擎（Timetable Engine）

專案核心：把「老師 × 班級 × 教室 × 時段」排成一張零衝突的課表（OR-Tools CP-SAT）。
主角因此不是建築，而是一台正在求解的機器：
  · 浮空的立體課表棋盤（星期一～五 × 第 1～6 節），各科彩色積木嵌在格子裡
  · 龍門式求解機械臂（GantryBridge / GantryHead）來回把積木放進空格
  · 幾塊積木懸在空格上方，依序落下（Drop_0..3）——求解進行中
  · 發光的約束線連接同一位老師的課，代表「不撞堂」的約束
  · 背面懸浮的時鐘（ClockHand / ClockHandH）＝時段
  · 棋盤底部是黃銅齒輪引擎（GearA / GearB）與發光核心

用法：python tools/blender/build_scheduling.py <輸出.glb>
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, beam, box, cyl, finalize, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'scheduling.glb'
kit.reset()
kit.standard_materials()

# ───────────────────────── 專屬材質 ─────────────────────────
def tex_board():
    W = 512
    img = Image.new('RGB', (W, W), (14, 40, 82))
    d = ImageDraw.Draw(img)
    for i in range(0, W, 16):
        d.line([(i, 0), (i, W)], fill=(28, 62, 112))
        d.line([(0, i), (W, i)], fill=(28, 62, 112))
    for i in range(0, W, 64):
        d.line([(i, 0), (i, W)], fill=(52, 96, 156))
        d.line([(0, i), (W, i)], fill=(52, 96, 156))
    arr = np.asarray(img, np.float32) * (0.9 + kit.noise(W, 6, 3, 11)[..., None] * 0.2)
    return save('board', arr)


material('board', rough=0.7, tex=tex_board())
material('brass', srgb('#c9a24a'), rough=0.3, metal=0.9)
material('brass_dark', srgb('#8a6a2a'), rough=0.4, metal=0.85)
material('steel_dark', srgb('#3a4250'), rough=0.45, metal=0.8)
material('grid_line', srgb('#9fd0ff'), emit=srgb('#7fc4ff'), emit_strength=1.6)
material('thread', srgb('#7ff3ff'), emit=srgb('#5fe8ff'), emit_strength=5)
material('core', srgb('#ffd98a'), emit=srgb('#ffc24a'), emit_strength=7)
material('dial', srgb('#f4ecd8'), rough=0.6)
material('hand', srgb('#1d2430'), rough=0.4, metal=0.6)

SUBJECTS = {
    '國語': '#e45b5b', '數學': '#4f86f7', '英語': '#f29b30', '自然': '#36b37e',
    '社會': '#9b6ce0', '體育': '#ef5d9c', '音樂': '#1fb6c9', '美勞': '#f2c230',
}
for name, col in SUBJECTS.items():
    material(f'subj_{name}', rough=0.42, tex=kit.label_texture(name, name, col))
for i, t in enumerate('一二三四五'):
    material(f'day_{i}', rough=0.5, metal=0.2, tex=kit.label_texture(f'day{i}', t, '#c9a24a', fg=(40, 30, 10), size=(200, 200), font_size=120))
for i in range(6):
    material(f'per_{i}', rough=0.5, tex=kit.label_texture(f'per{i}', str(i + 1), '#22324a', fg=(207, 227, 255), size=(200, 200), font_size=120))
label_block = kit.label_block


# ───────────────────────── 浮空引擎底座 ─────────────────────────
box('board', (4.0, 4.0, 0.22), (0, 0, -0.11), 'board', bevel=0.02)
for (sx, sy, x, y) in [(4.2, 0.14, 0, 2.03), (4.2, 0.14, 0, -2.03), (0.14, 3.92, 2.03, 0), (0.14, 3.92, -2.03, 0)]:
    box('rim', (sx, sy, 0.3), (x, y, -0.09), 'brass', bevel=0.03)
for x in (-2.03, 2.03):
    for y in (-2.03, 2.03):
        cyl('rim_cap', 0.13, 0.36, (x, y, -0.08), 'brass_dark', verts=16)
        kit.ico('rim_bolt', 0.06, (x, y, 0.12), 'brass', sub=1)
box('undercarriage', (3.6, 3.6, 0.32), (0, 0, -0.38), 'steel_dark', bevel=0.03)
for k in range(8):
    a = k / 8 * math.tau
    beam('strut', (math.cos(a) * 1.5, math.sin(a) * 1.5, -0.5), (0, 0, -1.6), 0.07, 'steel_dark')
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, radius=0.32, location=(0, 0, -1.65))
finalize(bpy.context.active_object, 'core')
cyl('core_ring', 0.5, 0.06, (0, 0, -1.65), 'brass', verts=32)


def gear(name, loc, r, teeth, axis='y', thick=0.12):
    rot = (math.pi / 2, 0, 0) if axis == 'y' else (0, math.pi / 2, 0)
    parts = [cyl(f'{name}_disc', r, thick, loc, 'brass', rot=rot, verts=32, group=name)]
    parts.append(cyl(f'{name}_hub', r * 0.3, thick * 1.6, loc, 'brass_dark', rot=rot, verts=16, group=name))
    for t in range(teeth):
        a = t / teeth * math.tau
        if axis == 'y':
            p = (loc[0] + math.cos(a) * (r + 0.05), loc[1], loc[2] + math.sin(a) * (r + 0.05))
            parts.append(box(f'{name}_tooth', (0.09, thick, 0.1), p, 'brass', rot=(0, -a, 0), group=name, bevel=0.01, segs=1))
        else:
            p = (loc[0], loc[1] + math.cos(a) * (r + 0.05), loc[2] + math.sin(a) * (r + 0.05))
            parts.append(box(f'{name}_tooth', (thick, 0.09, 0.1), p, 'brass', rot=(a, 0, 0), group=name, bevel=0.01, segs=1))
    return parts


gear('GearA', (-0.9, -1.86, -0.62), 0.5, 18, 'y')
gear('GearB', (0.05, -1.86, -0.8), 0.32, 12, 'y')
gear('GearC', (1.86, 0.6, -0.66), 0.45, 16, 'x')

# ───────────────────────── 立體課表 ─────────────────────────
CW, CH = 0.56, 0.42           # 每格 x / y 尺寸
GX0, GY1 = -1.25, 1.18        # 課表左緣 x、最上方（第 1 節）y
cells = {}
for d in range(5):
    for p in range(6):
        cells[(d, p)] = (GX0 + CW * (d + 0.5), GY1 - CH * (p + 0.5))
# 格線（微微發光）
for d in range(6):
    x = GX0 + CW * d
    box('grid_v', (0.02, CH * 6, 0.025), (x, GY1 - CH * 3, 0.012), 'grid_line', bevel=0)
for p in range(7):
    y = GY1 - CH * p
    box('grid_h', (CW * 5, 0.02, 0.025), (GX0 + CW * 2.5, y, 0.012), 'grid_line', bevel=0)
# 星期與節次標籤
for d in range(5):
    label_block(f'day_{d}', (CW - 0.08, 0.3, 0.1), (cells[(d, 0)][0], GY1 + 0.22, 0.05), f'day_{d}', bevel=0.02)
for p in range(6):
    label_block(f'per_{p}', (0.3, CH - 0.08, 0.1), (GX0 - 0.24, cells[(0, p)][1], 0.05), f'per_{p}', bevel=0.02)

TIMETABLE = [  # [day][period]
    ['國語', '數學', '英語', '自然', '體育', '美勞'],
    ['數學', '國語', '社會', '音樂', '自然', '國語'],
    ['英語', '數學', '國語', '體育', '社會', '音樂'],
    ['國語', '自然', '數學', '英語', '美勞', '社會'],
    ['數學', '國語', '音樂', '社會', '英語', '體育'],
]
DROPS = [(1, 2), (3, 0), (2, 4), (4, 1)]   # 這幾格的積木懸在空中、會依序落下
BH = 0.16
for d in range(5):
    for p in range(6):
        x, y = cells[(d, p)]
        subj = TIMETABLE[d][p]
        if (d, p) in DROPS:
            i = DROPS.index((d, p))
            kit.cyl(f'slot_glow_{i}', 0.04, 0.01, (x, y, 0.03), 'thread', verts=12)
            label_block(f'Drop_{i}', (CW - 0.08, CH - 0.08, BH), (x, y, BH / 2 + 0.55), f'subj_{subj}', group=f'Drop_{i}')
        else:
            label_block(f'cell_{d}_{p}', (CW - 0.08, CH - 0.08, BH), (x, y, BH / 2 + 0.01), f'subj_{subj}')

# 約束線：同一位老師（數學）的課以發光弧線相連 → 不能撞堂
math_cells = [cells[(d, p)] for d in range(5) for p in range(6) if TIMETABLE[d][p] == '數學' and (d, p) not in DROPS]
for a, b in zip(math_cells, math_cells[1:]):
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.55)
    beam('thread', (a[0], a[1], BH + 0.02), mid, 0.018, 'thread', round_=True, group='Fx_thread')
    beam('thread', mid, (b[0], b[1], BH + 0.02), 0.018, 'thread', round_=True, group='Fx_thread')
    kit.ico('thread_node', 0.035, mid, 'thread', sub=1, group='Fx_thread')

# ───────────────────────── 龍門式求解機械臂 ─────────────────────────
GZ = 1.35
for x in (-1.75, 1.75):
    for y in (-1.75, 1.75):
        beam('gantry_post', (x, y, 0), (x, y, GZ), 0.08, 'steel_dark')
        box('gantry_foot', (0.18, 0.18, 0.06), (x, y, 0.03), 'brass_dark', bevel=0.01)
    box('gantry_rail', (0.1, 3.7, 0.1), (x, 0, GZ), 'brass', bevel=0.012)
BY0 = 0.3
box('bridge_beam', (3.6, 0.14, 0.12), (0, BY0, GZ + 0.11), 'steel_dark', group='GantryBridge', bevel=0.015)
for x in (-1.75, 1.75):
    box('bridge_shoe', (0.2, 0.26, 0.14), (x, BY0, GZ + 0.1), 'brass_dark', group='GantryBridge', bevel=0.015)
HX0 = -0.4
box('head_carriage', (0.26, 0.24, 0.18), (HX0, BY0, GZ + 0.11), 'brass', group='GantryHead', bevel=0.02)
cyl('head_rod', 0.025, 0.7, (HX0, BY0, GZ - 0.3), 'steel', group='GantryHead')
box('gripper_plate', (0.22, 0.06, 0.03), (HX0, BY0, GZ - 0.66), 'steel_dark', group='GantryHead', bevel=0.005)
for s in (-1, 1):
    box('gripper_claw', (0.02, 0.05, 0.12), (HX0 + s * 0.24, BY0, GZ - 0.73), 'steel_dark', group='GantryHead', bevel=0.004)
label_block('carried', (CW - 0.08, CH - 0.08, BH), (HX0, BY0, GZ - 0.75), 'subj_自然', group='GantryHead')
kit.ico('head_light', 0.04, (HX0, BY0 - 0.13, GZ + 0.11), 'thread', sub=1, group='GantryHead')

# ───────────────────────── 懸浮時鐘（時段） ─────────────────────────
CLX, CLY, CLZ = 0.15, 2.25, 2.05
cyl('clock_face', 0.62, 0.05, (CLX, CLY, CLZ), 'dial', rot=(math.pi / 2, 0, 0), verts=48)
bpy.ops.mesh.primitive_torus_add(major_radius=0.64, minor_radius=0.045, location=(CLX, CLY, CLZ), rotation=(math.pi / 2, 0, 0))
finalize(bpy.context.active_object, 'brass')
for t in range(12):
    a = t / 12 * math.tau
    box('clock_tick', (0.03, 0.02, 0.1 if t % 3 else 0.16), (CLX + math.sin(a) * 0.5, CLY - 0.03, CLZ + math.cos(a) * 0.5), 'hand', rot=(0, -a, 0), bevel=0)
box('hand_min', (0.03, 0.02, 0.44), (CLX, CLY - 0.06, CLZ + 0.2), 'hand', group='ClockHand', bevel=0)
box('hand_hour', (0.05, 0.02, 0.3), (CLX, CLY - 0.07, CLZ + 0.13), 'brass_dark', group='ClockHandH', bevel=0)
kit.ico('clock_pin', 0.05, (CLX, CLY - 0.08, CLZ), 'brass', sub=1)
beam('clock_stem', (CLX, CLY, CLZ - 0.66), (CLX, CLY, 0.0), 0.06, 'brass_dark')
box('clock_base', (0.4, 0.2, 0.08), (CLX, CLY - 0.05, 0.04), 'brass', bevel=0.015)

# ───────────────────────── 細節：配課棋子、兩階段托盤、零衝突信號燈 ─────────────────────────
material('pawn_t', srgb('#4f86f7'), rough=0.35)
material('pawn_h', srgb('#e45b5b'), rough=0.35)
material('meter_bg', srgb('#22324a'), rough=0.6)
material('meter_ok', srgb('#36b37e'), emit=srgb('#36b37e'), emit_strength=1.2)
material('meter_hi', srgb('#f29b30'), emit=srgb('#f29b30'), emit_strength=1.2)
material('ok_lamp', srgb('#7dffb0'), emit=srgb('#3aff8a'), emit_strength=5)
material('tray', srgb('#1a2c44'), rough=0.4, metal=0.5)
material('phase1', rough=0.5, tex=kit.label_texture('ph1', 'Phase 1\n科任先排', '#c9a24a', fg=(40, 30, 10), size=(240, 140), font_size=40))
material('phase2', rough=0.5, tex=kit.label_texture('ph2', 'Phase 2\n導師接手', '#7fc4ff', fg=(10, 30, 50), size=(240, 140), font_size=40))
material('zero', rough=0.4, tex=kit.label_texture('zero', '硬衝突 0', '#0d2a52', fg=(127, 255, 176), size=(240, 100), font_size=46), emit=srgb('#ffffff'), emit_strength=0.8, emit_tex=True)
for k in range(5):
    x, y = -1.35 + k * 0.32, -1.68
    m = 'pawn_t' if k % 2 == 0 else 'pawn_h'
    kit.cone('pawn_body', 0.09, 0.04, 0.2, (x, y, 0.1), m, verts=16)
    kit.sphere('pawn_head', 0.055, (x, y, 0.25), m, seg=12, rings=8)
    box('meter_bg', (0.05, 0.02, 0.3), (x + 0.12, y, 0.15), 'meter_bg', bevel=0)
    h = [0.18, 0.24, 0.29, 0.14, 0.22][k]
    box('meter_fill', (0.04, 0.025, h), (x + 0.12, y - 0.003, h / 2 + 0.005), 'meter_hi' if h > 0.27 else 'meter_ok', bevel=0)
for k, (x, m) in enumerate([(0.55, 'phase1'), (1.2, 'phase2')]):
    box('tray', (0.55, 0.36, 0.06), (x, -1.68, 0.03), 'tray', bevel=0.01)
    for j in range(3):
        label_block(f'tray_block_{k}_{j}', (0.14, 0.11, 0.07), (x - 0.17 + j * 0.17, -1.66, 0.1), f"subj_{['體育', '音樂', '美勞'][j] if k == 0 else ['國語', '數學', '社會'][j]}", bevel=0.01)
    label_block(f'tray_label_{k}', (0.42, 0.02, 0.24), (x, -1.88, 0.16), m, bevel=0.004, face='front')
cyl('beacon_pole', 0.025, 0.6, (1.85, -1.2, 0.3), 'steel_dark', verts=8)
kit.sphere('beacon_lamp', 0.07, (1.85, -1.2, 0.64), 'ok_lamp', seg=14, rings=8, group='Pulse0')
label_block('zero_sign', (0.36, 0.02, 0.15), (1.85, -1.32, 0.42), 'zero', bevel=0.004, face='front')

# ── 點擊動畫節點（熱點附近的零件抽出成 Fx_ 節點） ──
kit.fx_node('Fx_thread', (0.0, 0.0, 0.0))
kit.fx_around('Fx_pieces', -0.75, -1.68, r=0.38, z0=0.03, z1=0.8)
kit.fx_around('Fx_trays', 0.9, -1.75, r=0.4, z0=0.03, z1=0.8)

# ───────────────────────── 合併、設定樞紐、匯出 ─────────────────────────
kit.merge_group('static', 'engine')
pivots = {}
for name, piv in [('GearA', (-0.9, -1.86, -0.62)), ('GearB', (0.05, -1.86, -0.8)), ('GearC', (1.86, 0.6, -0.66)),
                  ('ClockHand', (CLX, CLY - 0.06, CLZ)), ('ClockHandH', (CLX, CLY - 0.07, CLZ)),
                  ('GantryBridge', (0, BY0, GZ)), ('GantryHead', (HX0, BY0, GZ))]:
    pivots[name] = kit.pivot(kit.merge_group(name, name.lower()), name, piv)
for i, (d, p) in enumerate(DROPS):
    x, y = cells[(d, p)]
    kit.pivot(kit.merge_group(f'Drop_{i}', f'drop{i}'), f'Drop_{i}', (x, y, 0.55))
# 機械臂頭掛在橫樑下，跟著橫樑移動
kit.pivot(kit.merge_group('Pulse0', 'beacon'), 'Pulse0', (1.85, -1.2, 0.64))
head, bridge = pivots['GantryHead'], pivots['GantryBridge']
head.parent = bridge
head.matrix_parent_inverse = bridge.matrix_world.inverted()

kit.export(OUT)
