"""
《班級成果展》—— 主模型

專案核心：同學不用寫程式，只要用說的跟 Claude 描述需求，就做出自己的互動網頁；
全班 23 件互動作品＋1 首原創音樂，集結成一個線上成果展。
主角物件：教室裡的「成果展攤位」——中央展桌上的筆電（對話即創作），周圍每個展台代表一個作品分類：
  1. 筆電＋對話氣泡   說出需求 → 作品卡片從螢幕飛出      （Fx_keys 按鍵、FxHide_bubble 氣泡、FxHide_card* 作品卡）
  2. 街機台＋陀螺場   動作競技・3D 冒險 13 件遊戲          （Fx_stick 搖桿擺動、Fx_btn* 按鈕、Fx_top* 陀螺旋轉）
  3. 黑板畫架         校園故事（老師模擬器、學生吵架…）   （Fx_board 推拉黑板、Fx_chalk 粉筆書寫）
  4. 巨型手搖飲       心理測驗（你是哪一杯手搖飲…）       （Fx_cup 搖杯、Fx_straw 吸管升起）
  5. 幸運轉盤         課堂工具（抽籤、扭蛋、轉盤）         （Fx_wheel 轉盤旋轉、Fx_pointer 指針彈跳、FxHide_ticket 票券）
  6. 黑膠唱盤         音樂創作（音樂工作室、原創歌曲）     （Fx_record 唱片旋轉、Fx_arm 唱臂放下、FxHide_notes 音符）
鏡頭在 +X、-Y 側：高的物件（布條、街機、黑板）放後方，前方保持低矮。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import kit  # noqa: E402
from kit import box, cone, cyl, label_block, material, sphere, srgb, torus  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'classfair.glb'
ACCENT = '#f0b400'
kit.reset()
kit.standard_materials()
kit.nature_materials()
kit.detail_materials()

material('accent', srgb(ACCENT), rough=0.5)
material('red', srgb('#e8452c'), rough=0.55)
material('blue', srgb('#3b82f6'), rough=0.55)
material('teal', srgb('#14b8a6'), rough=0.55)
material('pink', srgb('#f472b6'), rough=0.6)
material('cream', srgb('#f6f2ea'), rough=0.85)
material('ink', srgb('#1d1b18'), rough=0.6)
material('laptop', srgb('#cfd3da'), rough=0.35, metal=0.6)
material('board', srgb('#2f5d50'), rough=0.9)
material('milktea', srgb('#d6ad7c'), rough=0.5)
material('vinyl', srgb('#151518'), rough=0.3)
material('screen_glow', srgb('#9be7ff'), emit=srgb('#5fd3ff'), emit_strength=1.6)
material('sign', rough=0.6, tex=kit.label_texture('classfair_sign', 'Claude 自製作品・班級成果展', '#1d1b18', fg=(255, 216, 77), size=(640, 120), font_size=50))
material('chat', rough=0.4, tex=kit.label_texture('classfair_chat', '幫我做一個\n夜市射氣球遊戲！', '#ffffff', fg=(29, 27, 24), size=(300, 200), font_size=36))
material('bubble', rough=0.6, tex=kit.label_texture('classfair_bubble', '說清楚需求\n就能做出來', '#ffd84d', fg=(29, 27, 24), size=(300, 170), font_size=40))
material('arcade_scr', rough=0.4, tex=kit.label_texture('classfair_game', 'GAME\nSTART', '#2a1a5e', fg=(255, 216, 77), size=(200, 160), font_size=46), emit=srgb('#3b2a80'), emit_strength=0.6)
material('chalk_txt', rough=0.95, tex=kit.label_texture('classfair_chalk', '今日課程\n老師模擬器', '#2f5d50', fg=(240, 240, 230), size=(260, 180), font_size=40, border=False))
material('chalk_txt2', rough=0.95, tex=kit.label_texture('classfair_chalk2', '學生吵架\n六關抉擇', '#2f5d50', fg=(255, 230, 150), size=(260, 180), font_size=40, border=False))
material('cup_band', rough=0.5, tex=kit.label_texture('classfair_cup', '手搖飲\n人格', '#e8452c', fg=(255, 255, 255), size=(220, 160), font_size=44))
material('ticket', rough=0.6, tex=kit.label_texture('classfair_ticket', '票券 ×3', '#ffd84d', fg=(232, 69, 44), size=(220, 110), font_size=44))
for i, (t, bg) in enumerate([('射氣球', '#e8452c'), ('排球', '#3b82f6'), ('抽籤', '#14b8a6')]):
    material(f'card{i}', rough=0.6, tex=kit.label_texture(f'classfair_card{i}', t, bg, size=(200, 140), font_size=48))

# ── 地塊：教室木地板 ──
kit.plinth('wood', soil_mat='soil', rock_mat='rock', rim_mat='concrete')

# ── 後方布條「Claude 自製作品・班級成果展」＋三角旗串 ──
for x in (-1.05, 1.05):
    cyl('banner_pole', 0.035, 1.95, (x, 1.7, 0.975), 'ink', verts=8)
    sphere('banner_knob', 0.06, (x, 1.7, 1.97), 'accent', seg=8, rings=6)
label_block('banner', (2.0, 0.04, 0.38), (0, 1.69, 1.72), 'sign', bevel=0.01, face='front')
flag_mats = ['red', 'accent', 'blue', 'teal', 'pink']
for side in (-1, 1):
    for k in range(5):
        u = (k + 0.5) / 5
        x = side * (1.05 + u * 0.8)
        z = 1.5 - math.sin(u * math.pi) * 0.18 - u * 0.35
        cone('flag', 0.09, 0.0, 0.16, (x, 1.72, z - 0.08), flag_mats[k], verts=3, rot=(0, math.pi, 0))
cyl('flag_pole_l', 0.025, 1.2, (-1.88, 1.72, 0.6), 'ink', verts=6)
cyl('flag_pole_r', 0.025, 1.2, (1.88, 1.72, 0.6), 'ink', verts=6)

# ── 1. 中央展桌＋筆電（對話就能做出作品） ──
box('table_top', (1.7, 1.0, 0.06), (0, 0.55, 0.5), 'cream', bevel=0.015)
box('table_cloth', (1.72, 0.04, 0.36), (0, 0.04, 0.31), 'accent', bevel=0)
for (x, y) in [(-0.78, 0.98), (0.78, 0.98), (-0.78, 0.12), (0.78, 0.12)]:
    cyl('table_leg', 0.03, 0.47, (x, y, 0.235), 'ink', verts=6)
box('laptop_base', (0.9, 0.62, 0.04), (0, 0.55, 0.55), 'laptop', bevel=0.012)
for r in range(3):
    for c in range(8):
        box('key', (0.08, 0.07, 0.02), (-0.36 + c * 0.103, 0.48 + r * 0.09, 0.575), 'ink', bevel=0, group='Fx_keys')
box('laptop_lid', (0.9, 0.035, 0.6), (0, 0.88, 0.86), 'laptop', rot=(-0.2, 0, 0), bevel=0.012)
label_block('laptop_chat', (0.8, 0.01, 0.5), (0, 0.855, 0.865), 'chat', bevel=0, face='front', rot=(-0.2, 0, 0))
# 點擊才出現：「說清楚需求」對話氣泡＋從螢幕飛出的三張作品卡
label_block('bubble', (0.78, 0.05, 0.42), (0.05, 0.86, 1.52), 'bubble', bevel=0.02, face='front', group='FxHide_bubble')
cone('bubble_tail', 0.08, 0.0, 0.14, (-0.12, 0.86, 1.27), 'accent', verts=3, rot=(math.pi, 0, 0), group='FxHide_bubble')
for i in range(3):
    label_block(f'card{i}', (0.32, 0.02, 0.22), (-0.36 + i * 0.36, 0.7, 0.95 + (i % 2) * 0.08), f'card{i}', bevel=0.006, face='front', group=f'FxHide_card{i}')

# ── 2. 街機台（動作競技・3D 冒險）＋陀螺競技場 ──
AX_, AY = -1.35, 1.0
box('arcade_body', (0.66, 0.55, 1.25), (AX_, AY + 0.05, 0.625), 'red', bevel=0.02)
box('arcade_side_l', (0.04, 0.6, 1.3), (AX_ - 0.35, AY + 0.05, 0.65), 'ink', bevel=0)
box('arcade_side_r', (0.04, 0.6, 1.3), (AX_ + 0.35, AY + 0.05, 0.65), 'ink', bevel=0)
label_block('arcade_screen', (0.52, 0.03, 0.4), (AX_, AY - 0.24, 0.98), 'arcade_scr', bevel=0, face='front', rot=(-0.25, 0, 0))
box('arcade_marquee', (0.66, 0.12, 0.16), (AX_, AY - 0.12, 1.33), 'accent', bevel=0.01)
box('arcade_panel', (0.62, 0.3, 0.08), (AX_, AY - 0.34, 0.66), 'ink', rot=(0.3, 0, 0), bevel=0.01)
cyl('stick_rod', 0.018, 0.16, (AX_ - 0.14, AY - 0.36, 0.76), 'steel', verts=6, group='Fx_stick')
sphere('stick_ball', 0.05, (AX_ - 0.14, AY - 0.36, 0.85), 'red', seg=10, rings=6, group='Fx_stick')
for i, (dx, m) in enumerate([(0.06, 'accent'), (0.17, 'blue')]):
    cyl(f'btn{i}', 0.04, 0.04, (AX_ + dx, AY - 0.38, 0.71), m, verts=10, group=f'Fx_btn{i}')
# 陀螺場
SX, SY = -1.5, -0.15
cyl('stadium', 0.46, 0.08, (SX, SY, 0.04), 'blue', verts=20)
torus('stadium_rim', 0.46, 0.035, (SX, SY, 0.09), 'accent', major=24, minor=6)
cyl('stadium_floor', 0.42, 0.01, (SX, SY, 0.085), 'cream', verts=20)
for i, (dx, dy, m) in enumerate([(-0.14, 0.05, 'red'), (0.15, -0.06, 'teal')]):
    cone(f'top{i}_body', 0.13, 0.02, 0.1, (SX + dx, SY + dy, 0.15), m, verts=8, rot=(math.pi, 0, 0), group=f'Fx_top{i}')
    cyl(f'top{i}_ring', 0.14, 0.025, (SX + dx, SY + dy, 0.2), 'steel', verts=8, group=f'Fx_top{i}')
    cyl(f'top{i}_tip', 0.025, 0.08, (SX + dx, SY + dy, 0.25), 'ink', verts=6, group=f'Fx_top{i}')

# ── 3. 黑板畫架（校園故事） ──
BX, BY = 1.3, 1.15
for dx in (-0.48, 0.48):
    kit.beam('easel_leg', (BX + dx, BY + 0.12, 0), (BX + dx * 0.9, BY, 1.4), 0.05, 'wood')
kit.beam('easel_back', (BX, BY + 0.45, 0), (BX, BY + 0.05, 1.3), 0.05, 'wood')
box('board_frame', (1.04, 0.05, 0.72), (BX, BY - 0.02, 0.95), 'wood', bevel=0.01)
label_block('board_back', (0.96, 0.02, 0.62), (BX, BY - 0.05, 0.95), 'chalk_txt2', bevel=0, face='front')
label_block('board_front', (0.48, 0.02, 0.62), (BX - 0.24, BY - 0.075, 0.95), 'chalk_txt', bevel=0, face='front', group='Fx_board')
box('board_tray', (1.04, 0.1, 0.03), (BX, BY - 0.08, 0.6), 'wood', bevel=0)
box('chalk', (0.09, 0.025, 0.025), (BX + 0.1, BY - 0.11, 0.63), 'white', bevel=0, group='Fx_chalk')
box('eraser', (0.14, 0.05, 0.04), (BX + 0.35, BY - 0.11, 0.635), 'blue', bevel=0.005)

# ── 4. 巨型手搖飲（心理測驗） ──
CX, CY = -1.3, -1.15
cone('cup_body', 0.24, 0.3, 0.72, (CX, CY, 0.36), 'milktea', verts=16, group='Fx_cup')
cyl('cup_band', 0.285, 0.2, (CX, CY, 0.42), 'red', verts=16, group='Fx_cup')
label_block('cup_label', (0.3, 0.02, 0.2), (CX, CY - 0.27, 0.42), 'cup_band', bevel=0, face='front', group='Fx_cup')
cyl('cup_lid', 0.31, 0.05, (CX, CY, 0.745), 'cream', verts=16, group='Fx_cup')
for i in range(6):
    a = i / 6 * math.tau
    sphere('pearl', 0.05, (CX + math.cos(a) * 0.12, CY + math.sin(a) * 0.12 - 0.12, 0.08), 'ink', seg=6, rings=4)
cyl('straw', 0.035, 0.6, (CX + 0.05, CY, 0.95), 'pink', verts=8, group='Fx_straw')

# ── 5. 幸運轉盤（課堂工具） ──
WX, WY, WZ = 1.45, -0.45, 0.72
for dx in (-0.2, 0.2):
    kit.beam('wheel_leg', (WX + dx * 1.6, WY + 0.1, 0), (WX, WY + 0.04, WZ), 0.05, 'ink')
cyl('wheel_disc', 0.42, 0.05, (WX, WY - 0.02, WZ), 'cream', verts=24, rot=(math.pi / 2, 0, 0), group='Fx_wheel')
seg_mats = ['red', 'accent', 'blue', 'teal', 'pink', 'accent', 'red', 'teal']
for k in range(8):
    a = k / 8 * math.tau
    box(f'wheel_seg{k}', (0.3, 0.02, 0.12), (WX + math.cos(a) * 0.22, WY - 0.055, WZ + math.sin(a) * 0.22), seg_mats[k], rot=(0, -a, 0), bevel=0, group='Fx_wheel')
cyl('wheel_hub', 0.06, 0.08, (WX, WY - 0.07, WZ), 'ink', verts=10, rot=(math.pi / 2, 0, 0), group='Fx_wheel')
cone('wheel_pointer', 0.06, 0.0, 0.14, (WX, WY - 0.08, WZ + 0.47), 'red', verts=3, rot=(math.pi, 0, 0), group='Fx_pointer')
label_block('ticket', (0.34, 0.02, 0.17), (WX, WY - 0.1, WZ + 0.72), 'ticket', bevel=0.005, face='front', group='FxHide_ticket')

# ── 6. 黑膠唱盤（音樂創作） ──
TX, TY = 0.25, -1.3
box('deck', (0.92, 0.7, 0.12), (TX, TY, 0.06), 'wood', bevel=0.02)
cyl('platter', 0.32, 0.02, (TX - 0.1, TY, 0.13), 'steel', verts=24)
cyl('record', 0.3, 0.015, (TX - 0.1, TY, 0.148), 'vinyl', verts=24, group='Fx_record')
cyl('record_label', 0.1, 0.017, (TX - 0.1, TY, 0.15), 'accent', verts=12, group='Fx_record')
box('record_mark', (0.06, 0.02, 0.005), (TX - 0.1 + 0.18, TY, 0.158), 'cream', bevel=0, group='Fx_record')
cyl('arm_base', 0.05, 0.06, (TX + 0.32, TY + 0.22, 0.15), 'steel', verts=10)
kit.beam('arm', (TX + 0.32, TY + 0.22, 0.19), (TX + 0.2, TY - 0.05, 0.19), 0.025, 'steel', round_=True)
box('arm_head', (0.05, 0.08, 0.03), (TX + 0.19, TY - 0.08, 0.18), 'ink', bevel=0)
kit.fx_extract('Fx_arm', (TX + 0.15, TY - 0.12, 0.16), (TX + 0.3, TY + 0.15, 0.22), max_size=0.4)
for i, (dx, z) in enumerate([(-0.25, 0.55), (0.0, 0.72), (0.22, 0.6)]):
    sphere('note_head', 0.05, (TX + dx, TY, z), 'ink', seg=8, rings=6, scale=(1.3, 1, 1), group='FxHide_notes')
    box('note_stem', (0.015, 0.015, 0.16), (TX + dx + 0.055, TY, z + 0.08), 'ink', bevel=0, group='FxHide_notes')

# ── 點綴：盆栽、觀展小椅凳、地上的作品卡 ──
for (x, y) in [(1.8, 0.35), (-0.55, 1.75), (0.55, 1.75)]:
    cyl('pot', 0.1, 0.16, (x, y, 0.08), 'brick', verts=8)
    kit.ico('bush', 0.17, (x, y, 0.28), 'leaf', sub=1)
for (x, y, m) in [(0.95, -0.35, 'teal'), (-0.55, -0.65, 'accent')]:
    cyl('stool_seat', 0.13, 0.04, (x, y, 0.3), m, verts=12)
    cyl('stool_leg', 0.03, 0.28, (x, y, 0.14), 'ink', verts=6)
for (x, y, a, m) in [(-0.2, -0.45, 0.4, 'card0'), (0.55, -0.2, -0.3, 'card1')]:
    label_block('floor_card', (0.24, 0.17, 0.01), (x, y, 0.006), m, bevel=0, face='top', rot=(0, 0, a))
kit.tree((1.75, 1.75, 0), s=0.45)
kit.tree((-1.78, 0.4, 0), s=0.4)

# ── 點擊動畫節點（樞紐＝轉軸／鉸鏈位置） ──
kit.fx_node('Fx_keys', (0, 0.57, 0.565))
kit.fx_node('FxHide_bubble', (0.05, 0.86, 1.3))
for i in range(3):
    kit.fx_node(f'FxHide_card{i}', (-0.36 + i * 0.36, 0.7, 0.95 + (i % 2) * 0.08))
kit.fx_node('Fx_stick', (AX_ - 0.14, AY - 0.36, 0.69))
kit.fx_node('Fx_btn0', (AX_ + 0.06, AY - 0.38, 0.71))
kit.fx_node('Fx_btn1', (AX_ + 0.17, AY - 0.38, 0.71))
kit.fx_node('Fx_top0', (SX - 0.14, SY + 0.05, 0.1))
kit.fx_node('Fx_top1', (SX + 0.15, SY - 0.06, 0.1))
kit.fx_node('Fx_board', (BX - 0.24, BY - 0.075, 0.95))
kit.fx_node('Fx_chalk', (BX + 0.1, BY - 0.11, 0.63))
cup = kit.fx_node('Fx_cup', (CX, CY, 0))
straw = kit.fx_node('Fx_straw', (CX + 0.05, CY, 0.65))
kit.reparent(straw, cup)
kit.fx_node('Fx_wheel', (WX, WY - 0.04, WZ))
kit.fx_node('Fx_pointer', (WX, WY - 0.08, WZ + 0.54))
kit.fx_node('FxHide_ticket', (WX, WY - 0.1, WZ + 0.6))
kit.fx_node('Fx_record', (TX - 0.1, TY, 0.15))
kit.fx_node('Fx_arm', (TX + 0.32, TY + 0.22, 0.19))
kit.fx_node('FxHide_notes', (TX, TY, 0.45))

# ── 合併、匯出 ──
# 精緻度升級：建築腰線／簷口，與依主題自動布置的微縮生活小道具（共用網格）
kit.articulate()
kit.dress('campus', 10, seed=63)
kit.merge_group('static', 'classfair')
kit.export(OUT)
