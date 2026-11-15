"""
《行政工作進度追蹤》3D 環境：巨大的辦公桌
· 主島飄浮在一張延伸到遠方的木紋辦公桌上方
· 四周是巨大的辦公用品：螢幕（顯示處室總覽）、鍵盤、咖啡杯、書與卷宗堆、檯燈、筆筒、盆栽
· 檯燈投下暖光；咖啡杯冒著熱氣（Bob）
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
import env  # noqa: E402
from kit import box, cone, cyl, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env_admin.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()


def tex_desk():
    W = 1024
    y = kit.np.linspace(0, 1, W)[None, :]
    grain = kit.noise(W, 4, 4, 81)
    st = kit.np.sin((y * 60 + grain * 6) * math.pi) * 0.5 + 0.5
    arr = kit.tint(kit.np.clip(st * 0.4 + grain * 0.6, 0, 1), (112, 72, 40), (168, 116, 70))
    return kit.save('bigdesk', kit.np.broadcast_to(arr, (W, W, 3)).copy())


def tex_monitor():
    W, H = 640, 400
    img = kit.Image.new('RGB', (W, H), (252, 250, 244))
    d = kit.ImageDraw.Draw(img)
    f = kit.ImageFont.truetype(kit.CJK_FONT, 40)
    d.rectangle([0, 0, W, 70], fill=(217, 98, 43))
    d.text((24, 12), '處室總覽', font=f, fill=(255, 255, 255))
    for k, (lab, n, col) in enumerate([('進行中', '12', (79, 134, 247)), ('逾期', '2', (228, 91, 91)), ('待更新', '3', (242, 155, 48)), ('已完成', '28', (54, 179, 126))]):
        x = 24 + k * 152
        d.rounded_rectangle([x, 100, x + 136, 220], radius=14, fill=col)
        d.text((x + 16, 108), lab, font=kit.ImageFont.truetype(kit.CJK_FONT, 28), fill=(255, 255, 255))
        d.text((x + 16, 150), n, font=kit.ImageFont.truetype(kit.CJK_FONT, 52), fill=(255, 255, 255))
    for k in range(3):
        d.rounded_rectangle([24, 250 + k * 46, W - 24, 284 + k * 46], radius=10, fill=(236, 230, 218))
    return kit.save('monitor', kit.np.asarray(img))


material('bigdesk', rough=0.5, tex=tex_desk())
material('monitor_screen', rough=0.3, tex=tex_monitor(), emit=srgb('#ffffff'), emit_strength=0.7, emit_tex=True)
material('plastic_d', srgb('#2a2c33'), rough=0.45, metal=0.3)
material('plastic_l', srgb('#e8e6e0'), rough=0.5)
material('mug', srgb('#f6f1e7'), rough=0.35)
material('coffee', srgb('#4a2c18'), rough=0.2)
material('steam', srgb('#ffffff'), rough=1.0, alpha=0.35)
material('book_r', srgb('#c0392b'), rough=0.7)
material('book_b', srgb('#2f5fb8'), rough=0.7)
material('book_g', srgb('#2f8a5a'), rough=0.7)
material('pages', srgb('#f6efdc'), rough=0.9)
material('lamp_shade', srgb('#d9622b'), rough=0.5)
material('lamp_glow', srgb('#fff2c8'), emit=srgb('#ffe2a0'), emit_strength=6)
material('pot', srgb('#c0603a'), rough=0.7)
material('pencil_y', srgb('#f2c230'), rough=0.5)
G = 'env'
F = -8.5   # 桌面高度

box('desk', (160, 160, 1.0), (0, 0, F - 0.5), 'bigdesk', group=G, bevel=0)
# 巨型螢幕（後方）
MX, MY = -4, 26
box('monitor', (26, 1.2, 16), (MX, MY, F + 13), 'plastic_d', group=G, bevel=0.3)
kit.label_block('monitor_screen', (24.5, 0.2, 14.5), (MX, MY - 0.7, F + 13), 'monitor_screen', group=G, bevel=0, face='front')
box('monitor_neck', (2.2, 1.2, 5), (MX, MY + 0.6, F + 2.5), 'plastic_d', group=G, bevel=0.2)
box('monitor_foot', (9, 5, 0.4), (MX, MY + 0.5, F + 0.2), 'plastic_d', group=G, bevel=0.2)
# 鍵盤（右前方）
KX, KY = 20, 6
box('keyboard', (16, 6, 0.8), (KX, KY, F + 0.4), 'plastic_l', rot=(0, 0, 0.5), group=G, bevel=0.2)
for r in range(4):
    for c in range(12):
        u, v = -6.6 + c * 1.2, -2.0 + r * 1.3
        x = KX + u * math.cos(0.5) - v * math.sin(0.5)
        y = KY + u * math.sin(0.5) + v * math.cos(0.5)
        box('key', (1.0, 1.05, 0.35), (x, y, F + 0.95), 'plastic_d', rot=(0, 0, 0.5), group=G, bevel=0.08)
# 咖啡杯（左前方）
CX, CY = -22, 4
cyl('mug', 3.2, 6.5, (CX, CY, F + 3.25), 'mug', verts=24, group=G)
cyl('coffee', 2.9, 0.2, (CX, CY, F + 6.3), 'coffee', verts=24, group=G)
kit.torus('mug_handle', 1.6, 0.45, (CX + 3.4, CY, F + 3.4), 'mug', rot=(math.pi / 2, 0, 0), group=G, major=20, minor=8)
for k in range(3):
    kit.ico('steam', 0.9 - k * 0.15, (CX + (k - 1) * 0.6, CY, F + 8 + k * 1.6), 'steam', sub=1, group='Bob0')
# 書與卷宗堆（右後方）
BX, BY = 22, 22
for k, m in enumerate(['book_r', 'book_b', 'book_g', 'book_b', 'book_r']):
    box('book', (9 - k * 0.4, 6.5 - k * 0.2, 1.4), (BX + (k % 2) * 0.6, BY, F + 0.7 + k * 1.45), m, rot=(0, 0, k * 0.08), group=G, bevel=0.1)
    box('book_pages', (8.6 - k * 0.4, 6.0 - k * 0.2, 1.2), (BX + (k % 2) * 0.6 + 0.3, BY, F + 0.7 + k * 1.45), 'pages', rot=(0, 0, k * 0.08), group=G, bevel=0)
# 檯燈（左後方）
LX, LY = -24, 20
cyl('lamp_base', 3.5, 0.6, (LX, LY, F + 0.3), 'plastic_d', verts=20, group=G)
kit.beam('lamp_arm1', (LX, LY, F + 0.6), (LX + 3, LY - 2, F + 11), 0.6, 'plastic_d', group=G)
kit.beam('lamp_arm2', (LX + 3, LY - 2, F + 11), (LX + 9, LY - 6, F + 13), 0.5, 'plastic_d', group=G)
cone('lamp_shade', 3.2, 1.0, 3.5, (LX + 10, LY - 7, F + 12.4), 'lamp_shade', verts=20, rot=(0.6, -0.5, 0), group=G)
kit.sphere('lamp_bulb', 1.1, (LX + 10.6, LY - 7.6, F + 11.2), 'lamp_glow', seg=16, rings=10, group=G)
# 筆筒與盆栽
PX, PY = 10, -22
cyl('pencil_cup', 2.2, 5, (PX, PY, F + 2.5), 'plastic_d', verts=16, group=G)
for k in range(5):
    a = k * 1.25
    kit.beam('pencil', (PX + math.cos(a) * 0.9, PY + math.sin(a) * 0.9, F + 1), (PX + math.cos(a) * 1.8, PY + math.sin(a) * 1.8, F + 9 + k * 0.4), 0.45, 'pencil_y', group=G)
QX, QY = -14, -20
cyl('plant_pot', 3, 5, (QX, QY, F + 2.5), 'pot', verts=16, group=G)
for k in range(7):
    a = k * 0.9
    kit.ico('plant_leaf', 1.8, (QX + math.cos(a) * 1.8, QY + math.sin(a) * 1.8, F + 6 + (k % 3) * 1.2), 'leaf' if k % 2 else 'leaf_dark', sub=1, scale=(1.4, 0.8, 0.5), group=G)
# ── 主島底座：從地面升起接住浮島，並有階梯相連 ──
material('cr_b1', srgb('#c2410c'), rough=0.7)
material('cr_b2', srgb('#2f5a8a'), rough=0.7)
material('cr_b3', srgb('#e8b04a'), rough=0.7)
env.cradle(F, 'books', mats=('cr_b1', 'cr_b2', 'cr_b1', 'cr_b2', 'cr_b3'))
kit.merge_group('env', 'env')
kit.pivot(kit.merge_group('Bob0', 'steam'), 'Bob0', (CX, CY, F + 8))
kit.export(OUT)
