"""
《C.A.R.E. System》—— 紙本反思卡照舊，最難手算的交給系統

專案核心：違規登錄 → 自動回溯 15 天內的再犯次數 → 達 3 次排入安全觀察員追蹤；
          學生繳回紙本反思卡即解除下課管制；公開看板只顯示統計、不露個資；
          管制期間仍可正常飲水與如廁（正向管教）。
主角：「反思庭園」—— 溫和、不帶懲罰感的空間：
      · 十五塊踏石圍成一圈＝15 天回溯視窗，依序亮起（Lit_0..14）
      · 中央的反思卡信箱，三張紙卡輪流飛入投遞口（Bob）＝繳回反思卡
      · 一座小小的守望亭＝安全觀察員值勤（亭上燈籠）
      · 公告看板只顯示「統計數字」＝不露個資
      · 飲水台與長椅＝管制期間也能喝水休息
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'care.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()

TEAL = '#0f9b8e'
material('lawn', rough=1.0, tex=save('lawn', kit.tint(kit.noise(512, 10, 5, 61), (110, 170, 92), (150, 200, 120))))
material('path', srgb('#e9dfca'), rough=0.9)
material('stone_soft', srgb('#d8d2c4'), rough=0.85)
material('stone_lit', srgb('#bff3ea'), emit=srgb('#3fe0c8'), emit_strength=2.4)
material('teal', srgb(TEAL), rough=0.45)
material('teal_light', srgb('#7fd6cc'), rough=0.5)
material('white', srgb('#fbf8f2'), rough=0.6)
material('wood_light', srgb('#c9935a'), rough=0.8)
material('roof_teal', srgb('#0c7f74'), rough=0.55)
material('paper', srgb('#fffaf0'), rough=0.9)
material('lamp', srgb('#ffe7a8'), emit=srgb('#ffd27a'), emit_strength=4)
material('water', srgb('#7fd0ff'), rough=0.05, metal=0.2, alpha=0.7)
material('flower_p', srgb('#ff9ec4'), rough=0.7)
material('flower_y', srgb('#ffd35a'), rough=0.7)


def tex_board():
    W, H = 512, 340
    img = Image.new('RGB', (W, H), (252, 250, 244))
    d = ImageDraw.Draw(img)
    f1 = ImageFont.truetype(kit.CJK_FONT, 40)
    f2 = ImageFont.truetype(kit.CJK_FONT, 30)
    d.rectangle([0, 0, W, 64], fill=(15, 155, 142))
    d.text((24, 10), '今日概況', font=f1, fill=(255, 255, 255))
    for i, (lab, val, h) in enumerate([('登錄', '3', 70), ('已回收', '2', 110), ('觀察中', '1', 45)]):
        x = 60 + i * 150
        d.rectangle([x, 290 - h * 1.6, x + 70, 290], fill=(15, 155, 142) if i != 2 else (242, 155, 48))
        d.text((x + 18, 290 - h * 1.6 - 44), val, font=f1, fill=(40, 50, 60))
        d.text((x - 6, 296), lab, font=f2, fill=(70, 80, 90))
    return save('care_board', np.asarray(img))


def tex_card(i):
    W, H = 200, 140
    img = Image.new('RGB', (W, H), (255, 250, 238))
    d = ImageDraw.Draw(img)
    d.rectangle([6, 6, W - 6, H - 6], outline=(15, 155, 142), width=4)
    d.text((22, 18), '反思卡', font=ImageFont.truetype(kit.CJK_FONT, 34), fill=(15, 120, 110))
    for k in range(3):
        d.line([(22, 74 + k * 20), (W - 22, 74 + k * 20)], fill=(180, 200, 196), width=3)
    return save(f'refl_{i}', np.asarray(img))


material('care_board', rough=0.6, tex=tex_board())
for i in range(3):
    material(f'refl_{i}', rough=0.8, tex=tex_card(i))
material('mailbox_sign', rough=0.6, tex=kit.label_texture('mbox', '反思卡', TEAL, size=(240, 110), font_size=58))
for i in range(15):
    material(f'day_{i}', rough=0.6, tex=kit.label_texture(f'd{i}', str(i + 1), '#d8d2c4', fg=(90, 96, 104), size=(120, 120), font_size=70, border=False))

kit.plinth('lawn', soil_mat='soil', rock_mat='rock', rim_mat='stone_soft')

# ── 15 天的踏石環（依序亮起） ──
R = 1.42
CX, CY = 0.0, -0.05
for i in range(15):
    a = math.pi / 2 - i * math.tau / 15
    x, y = CX + math.cos(a) * R, CY + math.sin(a) * R
    cyl('day_stone', 0.17, 0.06, (x, y, 0.03), 'stone_soft', verts=14, bevel=0.01)
    label_block(f'day_label_{i}', (0.16, 0.16, 0.012), (x, y, 0.066), f'day_{i}', bevel=0)
    cyl(f'day_glow_{i}', 0.19, 0.03, (x, y, 0.012), 'stone_lit', verts=14, group=f'Lit_{i}')
# 由外圈通往中央的小徑
for k in range(4):
    box('path', (0.32, 0.26, 0.02), (CX, CY - 0.45 - k * 0.3, 0.01), 'path', bevel=0.01)

# ── 中央：反思卡信箱 ──
cyl('mail_post', 0.05, 0.6, (CX, CY, 0.3), 'teal', verts=12)
box('mail_body', (0.5, 0.38, 0.36), (CX, CY, 0.78), 'teal', bevel=0.04, segs=3)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.19, depth=0.5, location=(CX, CY, 0.96), rotation=(0, math.pi / 2, 0))
kit.finalize(bpy.context.active_object, 'teal')
box('mail_slot', (0.3, 0.02, 0.035), (CX, CY - 0.2, 0.88), 'white', bevel=0.004)
label_block('mail_sign', (0.34, 0.02, 0.15), (CX, CY - 0.2, 0.72), 'mailbox_sign', bevel=0.003, face='front')
box('mail_flag', (0.03, 0.16, 0.03), (CX + 0.27, CY, 0.95), 'flower_y', bevel=0.004)
box('mail_flag_t', (0.03, 0.03, 0.12), (CX + 0.27, CY + 0.08, 1.01), 'flower_y', bevel=0.004)
for i in range(3):
    a = i * math.tau / 3
    label_block(f'refl_card_{i}', (0.22, 0.008, 0.15), (CX + math.cos(a) * 0.55, CY + math.sin(a) * 0.55 - 0.2, 1.3 + i * 0.12), f'refl_{i}',
                group=f'Bob{i}', bevel=0.002, face='front', rot=(0.2, 0, 0.3 * (i - 1)))

# ── 守望亭（安全觀察員） ──
GX, GY = 1.25, 1.2
box('kiosk_floor', (0.75, 0.75, 0.08), (GX, GY, 0.04), 'wood_light', bevel=0.01)
for dx in (-0.3, 0.3):
    for dy in (-0.3, 0.3):
        cyl('kiosk_post', 0.035, 0.7, (GX + dx, GY + dy, 0.43), 'white', verts=8)
box('kiosk_rail', (0.66, 0.03, 0.03), (GX, GY - 0.3, 0.32), 'white', bevel=0)
box('kiosk_desk', (0.4, 0.18, 0.04), (GX, GY + 0.15, 0.36), 'wood_light', bevel=0.006)
cone('kiosk_roof', 0.62, 0.02, 0.38, (GX, GY, 0.97), 'roof_teal', verts=4, rot=(0, 0, math.pi / 4))
kit.sphere('kiosk_lamp', 0.06, (GX, GY - 0.33, 0.68), 'lamp', seg=12, rings=8)
for k in range(5):
    box('kiosk_log', (0.06, 0.008, 0.08), (GX - 0.12 + k * 0.06, GY + 0.06, 0.39), 'paper', rot=(0.5, 0, 0), bevel=0)

# ── 公告看板（只顯示統計） ──
BX, BY = -1.3, 1.25
for dx in (-0.36, 0.36):
    cyl('board_leg', 0.03, 0.8, (BX + dx, BY, 0.4), 'wood_light', verts=8)
label_block('board', (0.8, 0.04, 0.53), (BX, BY - 0.02, 0.7), 'care_board', bevel=0.008, face='front')
cone('board_roof', 0.62, 0.0, 0.16, (BX, BY, 1.05), 'roof_teal', verts=4, rot=(0, 0, math.pi / 4))

# ── 飲水台與長椅（管制期間仍可喝水休息） ──
WX, WY = 1.35, -1.25
cyl('fountain_base', 0.14, 0.5, (WX, WY, 0.25), 'stone_soft', verts=16, bevel=0.01)
cyl('fountain_bowl', 0.2, 0.08, (WX, WY, 0.52), 'white', verts=20, bevel=0.01)
cyl('fountain_water', 0.17, 0.02, (WX, WY, 0.56), 'water', verts=20)
beam('spout', (WX, WY + 0.08, 0.56), (WX, WY + 0.02, 0.66), 0.012, 'water', round_=True)
for (x, y, r) in [(-1.3, -1.3, 0.0), (0.75, -1.65, 0.0)]:
    box('bench_seat', (0.5, 0.16, 0.04), (x, y, 0.2), 'wood_light', rot=(0, 0, r), bevel=0.006)
    box('bench_back', (0.5, 0.03, 0.14), (x, y + 0.08, 0.3), 'wood_light', rot=(0, 0, r), bevel=0.006)
    for dx in (-0.2, 0.2):
        box('bench_leg', (0.03, 0.14, 0.18), (x + dx, y, 0.09), 'white', bevel=0)

# ── 植栽 ──
for (x, y, s, k) in [(-1.7, 0.2, 0.7, 'round'), (1.72, 0.15, 0.6, 'round'), (-0.6, 1.72, 0.55, 'round'), (0.55, 1.75, 0.5, 'pine'), (-1.72, -0.75, 0.5, 'round')]:
    kit.tree((x, y, 0), s=s, kind=k)
for i in range(30):
    a = kit.rng.random() * math.tau
    r = 0.55 + kit.rng.random() * 0.55
    if abs(math.cos(a)) < 0.25 and math.sin(a) < 0:
        continue
    kit.sphere('flower', 0.028, (CX + math.cos(a) * r, CY + math.sin(a) * r, 0.03), 'flower_p' if i % 2 else 'flower_y', seg=8, rings=6)
for (x, y, r) in [(-0.95, 0.55, 0.16), (0.95, 0.6, 0.15), (-0.8, -0.9, 0.14)]:
    ico('bush', r, (x, y, r * 0.6), 'leaf', sub=2, scale=(1, 1, 0.75))

# ── 細節：違規登錄桌（筆電）、三鈴門檻拱門、稽核紀錄簿 ──
kit.detail_materials()
material('laptop', srgb('#3a3f4a'), rough=0.35, metal=0.6)
material('screen_teal', srgb('#bff3ea'), emit=srgb('#3fe0c8'), emit_strength=1.6)
material('bell', srgb('#e8c872'), rough=0.25, metal=0.9)
material('book_a', srgb('#0f9b8e'), rough=0.7)
material('book_b', srgb('#f29b30'), rough=0.7)
DX, DY = -0.62, -1.5
box('desk_top', (0.5, 0.3, 0.03), (DX, DY, 0.36), 'wood_light', bevel=0.006)
for sx in (-0.21, 0.21):
    for sy in (-0.11, 0.11):
        box('desk_leg', (0.025, 0.025, 0.34), (DX + sx, DY + sy, 0.17), 'white', bevel=0)
box('laptop_base', (0.24, 0.16, 0.015), (DX, DY + 0.02, 0.385), 'laptop', bevel=0.004)
box('laptop_lid', (0.24, 0.012, 0.16), (DX, DY + 0.1, 0.46), 'laptop', rot=(-0.25, 0, 0), bevel=0.004)
box('laptop_screen', (0.21, 0.013, 0.13), (DX, DY + 0.094, 0.46), 'screen_teal', rot=(-0.25, 0, 0), bevel=0)
box('stool', (0.16, 0.16, 0.2), (DX, DY - 0.28, 0.1), 'teal_light', bevel=0.02)
# 三鈴門檻拱門（小徑入口）
AX, AY = 0.0, -1.78
for sx in (-0.32, 0.32):
    cyl('arch_post', 0.035, 0.85, (AX + sx, AY, 0.425), 'white', verts=10)
kit.beam('arch_top', (AX - 0.36, AY, 0.85), (AX + 0.36, AY, 0.85), 0.06, 'teal')
for k, sx in enumerate((-0.18, 0.0, 0.18)):
    kit.beam('bell_cord', (AX + sx, AY, 0.83), (AX + sx, AY, 0.72), 0.008, 'white', round_=True)
    cone(f'bell_{k}', 0.06, 0.02, 0.1, (AX + sx, AY, 0.67), 'bell', verts=14, group=f'Bob{3 + k}')
# 稽核紀錄簿（守望亭桌上）
for k in range(4):
    box('record_book', (0.16, 0.11, 0.035), (GX - 0.12, GY + 0.12, 0.4 + k * 0.035), 'book_a' if k % 2 else 'book_b', rot=(0, 0, k * 0.12), bevel=0.004)

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'garden')
for i in range(15):
    a = math.pi / 2 - i * math.tau / 15
    kit.pivot(kit.merge_group(f'Lit_{i}', f'lit{i}'), f'Lit_{i}', (CX + math.cos(a) * R, CY + math.sin(a) * R, 0.012))
for k, sx in enumerate((-0.18, 0.0, 0.18)):
    kit.pivot(kit.merge_group(f'Bob{3 + k}', f'bell{k}'), f'Bob{3 + k}', (AX + sx, AY, 0.67))
for i in range(3):
    a = i * math.tau / 3
    kit.pivot(kit.merge_group(f'Bob{i}', f'card{i}'), f'Bob{i}', (CX + math.cos(a) * 0.55, CY + math.sin(a) * 0.55 - 0.2, 1.3 + i * 0.12))
kit.export(OUT)
