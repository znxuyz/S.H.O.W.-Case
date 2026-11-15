"""
《教室借用系統 H.C.R.S.》—— 告別 Excel 登記表，借教室只要三步

專案核心：老師申請借用教室（單次 / 每週 / 每月）→ 衝突檢查 → 主管審核 → 公開月曆。
主角：剖面式的校舍（正面牆拆開，可以看見每一間教室）——
      · 各間專科教室（電腦 / 視聽 / 自然 / 禮堂…）依序亮燈＝被借用（Lit_N）
      · 校舍前是一片「月曆廣場」：地磚就是本月月曆，已借用的日子嵌著彩色地磚
      · 一隻郵差鴿叼著申請單飛向主管室（Spin）＝送出申請、寄信通知
      · 「核准」印章在廣場上方蓋下（Bob）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'hcrs.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
kit.detail_materials()

BLUE = '#3563e9'
ROOMS = [('電腦教室', '#4f86f7'), ('視聽教室', '#9b6ce0'), ('自然教室', '#36b37e'), ('美勞教室', '#f29b30'),
         ('音樂教室', '#1fb6c9'), ('會議室', '#e45b5b'), ('圖書室', '#c9a24a'), ('禮堂', '#ef5d9c')]

material('lawn', rough=1.0, tex=save('lawn_h', kit.tint(kit.noise(512, 10, 5, 81), (110, 170, 92), (150, 200, 120))))
material('wall', srgb('#f6f1e7'), rough=0.85)
material('wall_trim', srgb('#e4dccb'), rough=0.8)
material('floor_wood', rough=0.7, tex=kit.tex_wood())
material('roof', srgb(BLUE), rough=0.5)
material('roof_dark', srgb('#2447a8'), rough=0.55)
material('glass', srgb('#a9d4ff'), rough=0.05, alpha=0.35)
material('desk', srgb('#d8b27a'), rough=0.7)
material('chair', srgb('#3a3f4a'), rough=0.5, metal=0.4)
material('board', srgb('#2f5a44'), rough=0.9)
material('screen', srgb('#9fd8ff'), emit=srgb('#7fc8ff'), emit_strength=2)
material('pigeon', srgb('#e8ecf2'), rough=0.6)
material('beak', srgb('#f2a33a'), rough=0.5)
material('paper', srgb('#fffaf0'), rough=0.9)
material('stamp', srgb('#c0392b'), rough=0.45)
material('stamp_handle', srgb('#6b4423'), rough=0.6)
material('plaza', srgb('#f1ece0'), rough=0.85)
for i, (name, col) in enumerate(ROOMS):
    material(f'room_{i}', srgb(col), emit=srgb(col), emit_strength=1.6)
    material(f'roomlabel_{i}', rough=0.5, tex=kit.label_texture(f'r{i}', name, col, size=(320, 110), font_size=54))


def tex_calendar():
    W, H = 700, 600
    img = Image.new('RGB', (W, H), (250, 247, 240))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(kit.CJK_FONT, 34)
    fh = ImageFont.truetype(kit.CJK_FONT, 44)
    d.rectangle([0, 0, W, 70], fill=kit.hexrgb(BLUE))
    d.text((24, 10), '借用狀況 · 11 月', font=fh, fill=(255, 255, 255))
    for k, wd in enumerate('日一二三四五六'):
        d.text((30 + k * 96, 82), wd, font=f, fill=(110, 116, 130))
    booked = {3: 0, 8: 1, 9: 2, 15: 0, 17: 7, 22: 1, 24: 0, 29: 2, 11: 4, 26: 5}
    for c in range(35):
        day = c - 5
        x, y = 12 + (c % 7) * 96, 130 + (c // 7) * 92
        if 1 <= day <= 30:
            col = kit.hexrgb(ROOMS[booked[day]][1]) if day in booked else (232, 228, 218)
            d.rounded_rectangle([x, y, x + 88, y + 84], radius=10, fill=col if day in booked else (240, 237, 228), outline=(220, 214, 200), width=2)
            d.text((x + 10, y + 6), str(day), font=f, fill=(255, 255, 255) if day in booked else (90, 96, 110))
    return save('hcrs_cal', np.asarray(img))


material('calendar', rough=0.6, tex=tex_calendar())
material('approved', rough=0.5, tex=kit.label_texture('ok', '核准', '#c0392b', size=(200, 200), font_size=96))
material('form', rough=0.8, tex=kit.label_texture('form', '申請\n借用', '#fffaf0', fg=(53, 99, 233), size=(160, 200), font_size=50))

kit.plinth('lawn', soil_mat='soil', rock_mat='rock', rim_mat='wall_trim')

# ── 剖面式校舍（後方，兩層 × 四間） ──
SX, SY = 0.0, 0.85     # 中心
W, D, FH = 3.3, 1.2, 0.62
RW = W / 4
box('found', (W + 0.12, D + 0.12, 0.08), (SX, SY, 0.04), 'wall_trim', bevel=0.01)
for f in range(2):
    z0 = 0.08 + f * FH
    box('floor', (W, D, 0.05), (SX, SY, z0 + 0.025), 'floor_wood', bevel=0.004)
    box('back_wall', (W, 0.08, FH), (SX, SY + D / 2 - 0.04, z0 + FH / 2), 'wall', bevel=0.006)
    for r in range(5):
        x = SX - W / 2 + r * RW
        box('partition', (0.06, D, FH), (x, SY, z0 + FH / 2), 'wall', bevel=0.006)
    for r in range(4):
        idx = f * 4 + r
        cx = SX - W / 2 + RW * (r + 0.5)
        # 教室內：黑板 / 螢幕 + 兩排課桌
        box('blackboard', (RW * 0.6, 0.02, 0.22), (cx, SY + D / 2 - 0.09, z0 + 0.36), 'board' if idx % 3 else 'screen', bevel=0)
        for row in range(2):
            for col in (-1, 1):
                dx, dy = col * RW * 0.2, SY + 0.05 - row * 0.32
                box('desk', (0.18, 0.12, 0.02), (cx + dx, dy, z0 + 0.2), 'desk', bevel=0.003)
                box('desk_leg', (0.16, 0.1, 0.15), (cx + dx, dy, z0 + 0.12), 'chair', bevel=0)
        # 借用燈：整間教室亮起（Lit）
        box(f'room_glow_{idx}', (RW - 0.1, 0.02, FH - 0.14), (cx, SY + D / 2 - 0.1, z0 + FH / 2 + 0.02), f'room_{idx}', bevel=0, group=f'Lit_{idx}')
        box(f'room_ceiling_glow_{idx}', (RW * 0.5, 0.08, 0.02), (cx, SY, z0 + FH - 0.02), f'room_{idx}', bevel=0, group=f'Lit_{idx}')
        label_block(f'room_label_{idx}', (RW * 0.8, 0.02, 0.12), (cx, SY - D / 2 - 0.02, z0 + FH - 0.06), f'roomlabel_{idx}', bevel=0.003, face='front')
    box('slab_edge', (W + 0.04, 0.06, 0.06), (SX, SY - D / 2, z0 + FH), 'wall_trim', bevel=0.006)
    # 正面只留半透明玻璃（剖面感）
    box('glass_front', (W, 0.01, FH - 0.1), (SX, SY - D / 2 + 0.01, z0 + FH / 2), 'glass', bevel=0)
# 屋頂
RZ = 0.08 + 2 * FH
box('roof_slab', (W + 0.2, D + 0.24, 0.06), (SX, SY, RZ + 0.03), 'wall_trim', bevel=0.01)
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.72, depth=W + 0.3, location=(SX, SY, RZ + 0.26), rotation=(0, math.pi / 2, 0))
roof = bpy.context.active_object
roof.rotation_euler = (math.pi / 2, 0, math.pi / 2)
roof.scale = (1, 0.42, 1)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
kit.finalize(roof, 'roof', bevel=0.02)
# 鐘塔
box('clock_tower', (0.5, 0.5, 0.55), (SX, SY - 0.1, RZ + 0.6), 'wall', bevel=0.02)
cyl('clock_face', 0.16, 0.03, (SX, SY - 0.36, RZ + 0.66), 'paper', rot=(math.pi / 2, 0, 0), verts=24)
box('hand_a', (0.02, 0.01, 0.12), (SX, SY - 0.38, RZ + 0.71), 'chair', bevel=0)
box('hand_b', (0.09, 0.01, 0.02), (SX + 0.04, SY - 0.38, RZ + 0.66), 'chair', bevel=0)
cone('tower_roof', 0.42, 0.0, 0.42, (SX, SY - 0.1, RZ + 1.08), 'roof_dark', verts=4, rot=(0, 0, math.pi / 4))

# ── 月曆廣場（前方地面） ──
label_block('calendar_plaza', (2.6, 2.2, 0.03), (SX - 0.1, -0.85, 0.015), 'calendar', bevel=0.006)
box('plaza_edge', (2.72, 2.32, 0.02), (SX - 0.1, -0.85, 0.005), 'wall_trim', bevel=0.004)

# 「核准」印章（Bob）
STX, STY = 1.0, -0.75
cyl('stamp_base', 0.22, 0.1, (STX, STY, 0.95), 'stamp', verts=24, bevel=0.01, group='Bob0')
label_block('stamp_face', (0.32, 0.32, 0.01), (STX, STY, 0.895), 'approved', bevel=0, group='Bob0')
cyl('stamp_neck', 0.08, 0.2, (STX, STY, 1.1), 'stamp_handle', verts=16, group='Bob0')
kit.sphere('stamp_knob', 0.13, (STX, STY, 1.26), 'stamp_handle', seg=16, rings=10, group='Bob0')

# 郵差鴿（Spin，繞著校舍飛）
PX, PY, PZ = -1.55, -0.2, 1.75
kit.sphere('pigeon_body', 0.13, (PX, PY, PZ), 'pigeon', seg=14, rings=10, scale=(1.5, 0.9, 0.9), group='Spin0')
kit.sphere('pigeon_head', 0.08, (PX + 0.18, PY, PZ + 0.07), 'pigeon', seg=12, rings=8, group='Spin0')
cone('pigeon_beak', 0.025, 0.0, 0.07, (PX + 0.27, PY, PZ + 0.06), 'beak', verts=8, rot=(0, math.pi / 2, 0), group='Spin0')
for s in (-1, 1):
    box('pigeon_wing', (0.22, 0.24, 0.02), (PX - 0.02, PY + s * 0.17, PZ + 0.05), 'pigeon', rot=(s * 0.4, 0, 0), bevel=0.01, group='Spin0')
label_block('pigeon_form', (0.12, 0.01, 0.15), (PX + 0.33, PY, PZ - 0.05), 'form', bevel=0.002, face='front', rot=(0, 0, math.pi / 2), group='Spin0')

# 植栽與路燈
# ── 校舍外觀細節：側牆窗、屋瓦、屋簷、雨遮 ──
for f in range(2):
    z = 0.08 + f * FH + FH / 2 + 0.02
    for side in (-1, 1):
        xw = SX + side * (W / 2 + 0.005)
        for k in range(2):
            kit.window_frame((xw, SY - 0.28 + k * 0.56, z), 0.34, 0.3, face='+x' if side > 0 else '-x', frame='wall_trim', glass='glass')
    box('canopy', (W + 0.06, 0.18, 0.025), (SX, SY - D / 2 - 0.09, 0.08 + f * FH + FH - 0.03), 'roof_dark', bevel=0.004)
# 屋瓦（前後兩面）
RH = 0.42 * 0.72
kit.roof_tiles(SX - W / 2 - 0.1, SX + W / 2 + 0.1, SY - D / 2 - 0.12, SY, RZ + 0.06, RZ + 0.06 + RH, 'roof_dark', rows=30)
kit.roof_tiles(SX - W / 2 - 0.1, SX + W / 2 + 0.1, SY + D / 2 + 0.12, SY, RZ + 0.06, RZ + 0.06 + RH, 'roof_dark', rows=30)
kit.beam('ridge', (SX - W / 2 - 0.15, SY, RZ + 0.08 + RH), (SX + W / 2 + 0.15, SY, RZ + 0.08 + RH), 0.07, 'wall_trim', round_=True)
box('gutter', (W + 0.3, 0.05, 0.04), (SX, SY - D / 2 - 0.13, RZ + 0.05), 'chair', bevel=0)
# 教室內：講桌、椅子
for f in range(2):
    z0 = 0.08 + f * FH
    for r in range(4):
        cx = SX - W / 2 + RW * (r + 0.5)
        box('teacher_desk', (0.26, 0.12, 0.13), (cx + 0.15, SY + 0.33, z0 + 0.12), 'desk', bevel=0.006)
        for row in range(2):
            for col in (-1, 1):
                box('chair_seat', (0.1, 0.08, 0.015), (cx + col * RW * 0.2, SY - 0.05 - row * 0.32, z0 + 0.12), 'chair', bevel=0)
                box('chair_back', (0.1, 0.012, 0.08), (cx + col * RW * 0.2, SY - 0.09 - row * 0.32, z0 + 0.17), 'chair', bevel=0)

# ── 校門與圍牆 ──
GX, GY = -1.62, -1.25
for dy in (-0.32, 0.32):
    box('gate_pillar', (0.16, 0.16, 0.6), (GX, GY + dy, 0.3), 'wall_trim', bevel=0.02)
    cyl('gate_lamp', 0.05, 0.05, (GX, GY + dy, 0.63), 'screen', verts=10)
box('gate_beam', (0.12, 0.8, 0.12), (GX, GY, 0.66), 'roof', bevel=0.012)
for k in range(6):
    box('gate_bar', (0.02, 0.02, 0.38), (GX, GY - 0.22 + k * 0.088, 0.21), 'chair', bevel=0)
kit.hedge((GX, GY + 1.25, 0), 1.6, axis='y')
kit.hedge((GX, GY - 0.48, 0), 0.25, axis='y')

# ── 花圃、樹、路燈、長椅、腳踏車、籃框 ──
kit.flowerbed((SX - 0.6, SY - D / 2 - 0.3, 0), 1.5)
kit.flowerbed((SX + 1.1, SY - D / 2 - 0.3, 0), 0.9)
for (x, y, s, k) in [(-1.75, -1.75, 0.62, 'round'), (1.75, -1.7, 0.56, 'round'), (1.8, 0.25, 0.5, 'pine'), (1.78, 1.6, 0.48, 'round')]:
    kit.tree((x, y, 0), s=s, kind=k)
for (x, y) in [(-1.35, -0.25), (1.45, -0.25), (0.25, -1.9)]:
    kit.lamp_post((x, y, 0), glow='screen')
box('bike_rack', (0.8, 0.04, 0.12), (1.38, 0.2, 0.06), 'chair', bevel=0)
for k, col in enumerate(['flower_r', 'roof', 'flower_y']):
    kit.bike((1.13 + k * 0.25, 0.2, 0), rot=math.pi / 2, color=col)
cyl('hoop_pole', 0.03, 0.9, (1.8, -1.1, 0.45), 'chair', verts=8)
box('hoop_board', (0.04, 0.3, 0.2), (1.76, -1.1, 0.9), 'wall', bevel=0.004)
kit.torus('hoop_ring', 0.07, 0.008, (1.68, -1.1, 0.82), 'flower_r', major=16, minor=4)
for (x, y, r) in [(-0.4, -1.95, 0.0), (0.95, -1.95, 0.0)]:
    box('bench_seat', (0.42, 0.13, 0.03), (x, y, 0.17), 'desk', bevel=0.004)
    box('bench_back', (0.42, 0.025, 0.12), (x, y - 0.065, 0.25), 'desk', bevel=0.004)
    for dx in (-0.17, 0.17):
        box('bench_leg', (0.025, 0.12, 0.16), (x + dx, y, 0.08), 'chair', bevel=0)

# ── 月曆廣場：已借用日以 3D 色塊浮起 ──
CAL_X, CAL_Y, CAL_W, CAL_D = SX - 0.1, -0.85, 2.6, 2.2
booked = {3: 0, 8: 1, 9: 2, 15: 0, 17: 7, 22: 1, 24: 0, 29: 2, 11: 4, 26: 5}
for c in range(35):
    day = c - 5
    if day in booked:
        u = (12 + (c % 7) * 96 + 44) / 700
        v = 1 - (130 + (c // 7) * 92 + 42) / 600
        x = CAL_X - CAL_W / 2 + u * CAL_W
        y = CAL_Y - CAL_D / 2 + v * CAL_D
        box('booked_tile', (0.3, 0.26, 0.05), (x, y, 0.055), f'room_{booked[day]}', bevel=0.012, group='Fx_tiles')

# ── 審核桌：印章落下的地方（桌上一張借用申請單） ──
box('review_desk', (0.56, 0.42, 0.04), (STX, STY, 0.64), 'desk', bevel=0.008)
for sx in (-0.23, 0.23):
    for sy in (-0.16, 0.16):
        box('review_leg', (0.03, 0.03, 0.62), (STX + sx, STY + sy, 0.31), 'chair', bevel=0)
label_block('review_form', (0.26, 0.32, 0.006), (STX, STY, 0.665), 'form', bevel=0)

# ── 三種借用方式：三向路標（單次／每週／每月） ──
material('sign_once', rough=0.6, tex=kit.label_texture('s1', '單次', BLUE, size=(240, 90), font_size=56))
material('sign_week', rough=0.6, tex=kit.label_texture('s2', '每週', '#36b37e', size=(240, 90), font_size=56))
material('sign_month', rough=0.6, tex=kit.label_texture('s3', '每月', '#f29b30', size=(240, 90), font_size=56))
SGX, SGY = 1.5, -0.55
cyl('sign_pole', 0.03, 1.0, (SGX, SGY, 0.5), 'wall_trim', verts=10, group='Fx_sign')
cone('sign_cap', 0.06, 0.0, 0.08, (SGX, SGY, 1.04), 'roof', verts=10, group='Fx_sign')
for k, (m, a) in enumerate([('sign_once', -0.5), ('sign_week', 0.9), ('sign_month', 2.4)]):
    label_block(f'sign_{k}', (0.34, 0.025, 0.11), (SGX + math.cos(a) * 0.17, SGY + math.sin(a) * 0.17, 0.92 - k * 0.15), m,
                bevel=0.004, face='front', rot=(0, 0, a), group='Fx_sign')
box('sign_base', (0.16, 0.16, 0.05), (SGX, SGY, 0.025), 'wall_trim', bevel=0.01)

# ── 自動寄信通知：校門旁的郵筒（蓋子掀開、信封飛出） ──
material('post_red', srgb('#d6453d'), rough=0.45)
material('envelope', rough=0.7, tex=kit.label_texture('env', '核准通知', '#fffaf0', fg=(53, 99, 233), size=(220, 140), font_size=40))
MBX, MBY = -1.6, -0.6
cyl('mbox_post', 0.035, 0.45, (MBX, MBY, 0.225), 'chair', verts=10)
box('mbox_body', (0.3, 0.24, 0.3), (MBX, MBY, 0.6), 'post_red', bevel=0.03, segs=3)
box('mbox_slot', (0.18, 0.012, 0.025), (MBX, MBY - 0.125, 0.66), 'chair', bevel=0)
box('mbox_lid', (0.32, 0.26, 0.04), (MBX, MBY, 0.77), 'post_red', bevel=0.012, group='Fx_mlid')
for k in range(2):
    label_block(f'mail_env_{k}', (0.2, 0.006, 0.13), (MBX - 0.03 + k * 0.06, MBY + 0.01 * k, 0.66), 'envelope', bevel=0.002, face='front', group='Fx_letter', rot=(0, 0, 0.2 * (k - 0.5)))

# ── 點擊動畫節點 ──
kit.fx_node('Fx_tiles', (CAL_X, CAL_Y, 0.03))
kit.fx_node('Fx_sign', (SGX, SGY, 0.0))
kit.fx_node('Fx_mlid', (MBX, MBY + 0.13, 0.77))
kit.fx_node('Fx_letter', (MBX, MBY, 0.6))
kit.fx_around('Fx_desk', STX, STY, r=0.32, z0=0.0, z1=0.7)

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'school')
for idx in range(8):
    kit.pivot(kit.merge_group(f'Lit_{idx}', f'room{idx}'), f'Lit_{idx}', (0, 0, 0))
kit.pivot(kit.merge_group('Bob0', 'stamp'), 'Bob0', (STX, STY, 0.95))
kit.pivot(kit.merge_group('Spin0', 'pigeon'), 'Spin0', (SX, -0.2, 0))
kit.export(OUT)
