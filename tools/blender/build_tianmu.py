"""
《天幕島》—— 天幕垂落，萬象歸島

專案核心：常駐在 Windows 螢幕頂端的「玄漆描金」懸浮膠囊，收納音樂、通知、時辰與專注。
主角：懸在水墨仙島上空的玄黑膠囊本身（正面顯示時辰與音樂），
      周圍環繞十二時辰環（Spin）、迴旋音符（SpinR）、傳音符紙與天燈（Bob）。
地景：喀斯特奇峰與松、湖面與石拱橋、重簷涼亭與燈籠。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'tianmu.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()

# ── 材質 ──
material('moss', rough=1.0, tex=save('moss', kit.tint(kit.noise(512, 7, 5, 31), (62, 82, 60), (104, 124, 92))))
def tex_karst():
    W = 512
    n = kit.noise(W, 5, 5, 32)
    streak = np.tile(np.sin(np.linspace(0, 60, W))[None, :] * 0.5 + 0.5, (W, 1))
    v = np.clip(n * 0.7 + streak * 0.2, 0, 1)
    return save('karst', kit.tint(v, (58, 62, 58), (132, 134, 122)))
material('karst', rough=0.95, tex=tex_karst())
material('stone_dark', srgb('#3b3a34'), rough=0.9)
material('stone', srgb('#9a968a'), rough=0.85)
material('water', srgb('#1a3b42'), rough=0.06, metal=0.3)
material('red', srgb('#8e2a1c'), rough=0.6)
material('roof', srgb('#4a5552'), rough=0.5, metal=0.15)
material('gold', srgb('#e8c872'), rough=0.25, metal=0.95)
material('lacquer', srgb('#0b0a09'), rough=0.12, metal=0.25)
material('lantern', srgb('#ff6a3d'), emit=srgb('#ff5a2a'), emit_strength=5)
material('warm', srgb('#ffcf7a'), emit=srgb('#ffb04a'), emit_strength=3)
material('note', srgb('#f0d48a'), rough=0.3, metal=0.8, emit=srgb('#e8c872'), emit_strength=1.2)


def display_texture():
    W, H = 640, 150
    img = Image.new('RGB', (W, H), (12, 11, 10))
    d = ImageDraw.Draw(img)
    gold = (232, 200, 114)
    f_big = ImageFont.truetype(kit.CJK_FONT, 78)
    f_small = ImageFont.truetype(kit.CJK_FONT, 34)
    d.text((40, 30), '09:41', font=f_big, fill=gold)
    d.text((300, 28), '天幕垂落', font=f_small, fill=gold)
    d.text((300, 80), '萬象歸島', font=f_small, fill=(180, 150, 90))
    for i in range(14):
        h = 20 + abs(math.sin(i * 0.9)) * 70
        d.rectangle([480 + i * 10, 115 - h, 486 + i * 10, 115], fill=gold)
    d.line([(20, 8), (W - 20, 8)], fill=gold, width=3)
    return save('display', np.asarray(img))


material('display', rough=0.2, tex=display_texture(), emit=srgb('#e8c872'), emit_strength=0.4)
HOURS = '子丑寅卯辰巳午未申酉戌亥'
for i, h in enumerate(HOURS):
    material(f'hour_{i}', rough=0.4, metal=0.3, tex=kit.label_texture(f'h{i}', h, '#1a1612', fg=(232, 200, 114), size=(160, 200), font_size=110))
for i, t in enumerate(['傳音', '驗證', '時辰']):
    material(f'charm_{i}', rough=0.9, tex=kit.label_texture(f'c{i}', t[0] + '\n' + t[1], '#f2d27a', fg=(170, 30, 20), size=(160, 260), font_size=88, border=False))

# ── 地塊 ──
kit.plinth('moss', soil_mat='soil', rock_mat='rock', rim_mat='stone_dark')

# 湖面與石拱橋
box('lake', (1.7, 1.5, 0.03), (0.95, -0.85, 0.005), 'water', bevel=0)
box('lake_edge', (1.8, 1.6, 0.02), (0.95, -0.85, -0.005), 'stone_dark', bevel=0.01)
for i in range(11):
    t = i / 10
    x = 0.12 + t * 1.66
    z = 0.06 + math.sin(t * math.pi) * 0.36
    ang = math.cos(t * math.pi) * 0.62
    box('bridge_stone', (0.18, 0.42, 0.08), (x, -0.85, z), 'stone', rot=(0, -ang, 0), bevel=0.012)
for side in (-0.2, 0.2):
    for i in range(10):
        t = (i + 0.5) / 10
        x = 0.12 + t * 1.66
        z = 0.15 + math.sin(t * math.pi) * 0.36
        cyl('rail_post', 0.012, 0.12, (x, -0.85 + side, z), 'stone', verts=6)

# 喀斯特奇峰（帶苔頂與松）
peaks = [(-1.25, 0.95, 1.9, 0.55), (-0.45, 1.35, 1.35, 0.45), (1.3, 1.2, 1.15, 0.42), (0.55, 1.55, 0.8, 0.35)]
for i, (x, y, h, r) in enumerate(peaks):
    # 上窄下寬、略帶傾斜的峰柱 + 圓潤苔頂
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=r, radius2=r * 0.42, depth=h, location=(x, y, h / 2))
    o = bpy.context.active_object
    for v in o.data.vertices:
        k = (v.co.z + h / 2) / h
        v.co.x *= 0.88 + kit.rng.random() * 0.24
        v.co.y *= 0.88 + kit.rng.random() * 0.24
        v.co.x += k * k * r * 0.25
    kit.finalize(o, 'karst', bevel=0.02)
    kit.sphere('peak_cap', r * 0.45, (x + r * 0.25, y, h), 'karst', seg=14, rings=8, scale=(1, 1, 0.7))
    ico('peak_moss', r * 0.4, (x + r * 0.25, y, h * 1.04), 'leaf_dark', sub=2, scale=(1, 1, 0.4))
    kit.tree((x + r * 0.35, y - r * 0.2, h * 0.78), s=0.45, kind='pine')
for (x, y, s) in [(-1.6, -0.2, 0.75), (1.65, 0.2, 0.6), (-0.2, 0.6, 0.55), (1.75, -1.7, 0.5)]:
    kit.tree((x, y, 0), s=s, kind='pine')
for (x, y, r) in [(0.2, 0.15, 0.16), (-1.7, -1.6, 0.12), (1.85, 0.9, 0.14), (0.05, -1.75, 0.1)]:
    ico('rock', r, (x, y, r * 0.5), 'stone', sub=1)

# 重簷涼亭
PX, PY = -1.05, -0.85
box('pav_base', (1.15, 1.15, 0.16), (PX, PY, 0.08), 'stone', bevel=0.02)
box('pav_step', (0.4, 0.2, 0.08), (PX, PY - 0.66, 0.04), 'stone', bevel=0.01)
for dx in (-0.4, 0.4):
    for dy in (-0.4, 0.4):
        cyl('pillar', 0.04, 0.62, (PX + dx, PY + dy, 0.47), 'red', verts=10)
box('pav_lintel', (0.92, 0.92, 0.06), (PX, PY, 0.8), 'red', bevel=0.01)
box('pav_glow', (0.6, 0.6, 0.4), (PX, PY, 0.45), 'warm', bevel=0.02)
for (lvl, w, h, z) in [(0, 1.5, 0.36, 0.98), (1, 0.95, 0.42, 1.38)]:
    cone(f'roof_{lvl}', w * 0.72, 0.02, h, (PX, PY, z), 'roof', verts=4, rot=(0, 0, math.pi / 4))
    half = w * 0.72 / math.sqrt(2)
    for k in range(4):
        a = k * math.pi / 2
        ex, ey = math.cos(a) * half, math.sin(a) * half
        box('eave_gold', (0.025, w * 1.02 if k % 2 == 0 else 0.025, 0.025) if False else (w * 1.02 if k % 2 else 0.025, 0.025 if k % 2 else w * 1.02, 0.025),
            (PX + ex, PY + ey, z - h / 2 + 0.01), 'gold', bevel=0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cone('eave_tip', 0.035, 0.0, 0.18, (PX + sx * w * 0.5, PY + sy * w * 0.5, z - h * 0.42), 'gold', verts=6, rot=(sy * 0.9, -sx * 0.9, 0))
    if lvl == 0:
        box('pav_upper', (0.55, 0.55, 0.22), (PX, PY, 1.17), 'red', bevel=0.01)
cyl('finial', 0.02, 0.3, (PX, PY, 1.72), 'gold', verts=8)
kit.sphere('finial_ball', 0.045, (PX, PY, 1.86), 'gold', seg=12, rings=8)
for sx in (-1, 1):
    for sy in (-1, 1):
        kit.sphere('lantern', 0.06, (PX + sx * 0.6, PY + sy * 0.6, 0.66), 'lantern', seg=12, rings=8, scale=(1, 1, 1.25))
        beam('lantern_cord', (PX + sx * 0.6, PY + sy * 0.6, 0.74), (PX + sx * 0.6, PY + sy * 0.6, 0.8), 0.008, 'gold', round_=True)

# ── 主角：天幕膠囊（Bob_0） ──
CX, CY, CZ = 0.25, 0.0, 2.55
L, R = 1.9, 0.3
kit.capsule('capsule', L, R, (CX, CY, CZ), 'lacquer', group='Bob_0')
for s in (-1, 1):
    kit.torus('cap_ring', R + 0.006, 0.014, (CX + s * L * 0.42, CY, CZ), 'gold', rot=(0, math.pi / 2, 0), group='Bob_0', major=48, minor=8)
box('cap_topline', (L * 0.9, 0.02, 0.012), (CX, CY, CZ + R + 0.002), 'gold', group='Bob_0', bevel=0)
label_block('cap_display', (L * 0.72, 0.02, R * 0.95), (CX, CY - R - 0.005, CZ), 'display', group='Bob_0', bevel=0.004, face='front')
kit.sphere('cap_pip', 0.035, (CX - L * 0.48, CY - R + 0.02, CZ + 0.06), 'warm', seg=12, rings=8, group='Bob_0')

# 十二時辰環（Spin_0）
kit.torus('hour_ring', 1.45, 0.014, (CX, CY, CZ), 'gold', group='Spin_0', major=96, minor=8)
for i in range(12):
    a = i / 12 * math.tau
    x, y = CX + math.cos(a) * 1.45, CY + math.sin(a) * 1.45
    label_block(f'hour_{i}', (0.14, 0.03, 0.18), (x, y, CZ), f'hour_{i}', group='Spin_0', bevel=0.006, face='front',
                rot=(0, 0, a + math.pi / 2))
# 迴旋音符（SpinR_0）
for i in range(4):
    a = i / 4 * math.tau + 0.4
    x, y, z = CX + math.cos(a) * 0.95, CY + math.sin(a) * 0.95, CZ + 0.45 + (i % 2) * 0.15
    kit.sphere('note_head', 0.06, (x, y, z), 'note', seg=12, rings=8, scale=(1.25, 1, 0.9), group='SpinR_0')
    box('note_stem', (0.016, 0.016, 0.26), (x + 0.06, y, z + 0.13), 'note', group='SpinR_0', bevel=0)
    box('note_flag', (0.1, 0.016, 0.04), (x + 0.11, y, z + 0.24), 'note', rot=(0, 0.5, 0), group='SpinR_0', bevel=0)
# 傳音符紙（Bob_1）
for i, (dx, dz, rz) in enumerate([(-1.05, 0.25, 0.25), (1.55, -0.1, -0.3), (-0.35, -0.55, 0.1)]):
    label_block(f'charm_{i}', (0.2, 0.008, 0.32), (CX + dx, CY - 0.55, CZ + dz), f'charm_{i}', group='Bob_1', bevel=0.002, face='front', rot=(0, rz, 0))
# 天燈（Bob_2）
for i, (x, y, z) in enumerate([(-1.6, 0.4, 2.1), (1.75, -0.6, 1.8), (-0.6, -1.5, 1.6), (1.2, 1.6, 2.6)]):
    box('sky_lantern', (0.13, 0.13, 0.18), (x, y, z), 'warm', group='Bob_2', bevel=0.02)

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'island')
kit.pivot(kit.merge_group('Bob_0', 'capsule'), 'Bob_0', (CX, CY, CZ))
kit.pivot(kit.merge_group('Spin_0', 'hours'), 'Spin_0', (CX, CY, CZ))
kit.pivot(kit.merge_group('SpinR_0', 'notes'), 'SpinR_0', (CX, CY, CZ))
kit.pivot(kit.merge_group('Bob_1', 'charms'), 'Bob_1', (CX, CY - 0.55, CZ))
kit.pivot(kit.merge_group('Bob_2', 'lanterns'), 'Bob_2', (0, 0, 2.1))
kit.export(OUT)
