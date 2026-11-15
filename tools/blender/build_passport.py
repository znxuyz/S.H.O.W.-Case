"""
《英語學習護照》—— 一到六年級的英聽練習，一鍵直達

專案核心：1–6 年級各一個英聽練習入口；孩子在家也能隨時開口練習。
主角：一本攤開的巨大護照書，書頁上浮起六座小島＝六個年級，
      每座島中央立著一枚年級印章（Grade 1–6，依序蓋下＝Lit 亮起）；
      紙飛機在書頁間循環飛行（Spin）；書頁上方飄著 A/B/C 字母積木與耳機（Bob）＝英聽。
地塊：直接以書本為主體（不使用草地方塊），書脊與封面為酒紅色皮革燙金。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'passport.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()

PINK = '#e0457b'
GRADE_COL = ['#e45b5b', '#f29b30', '#f2c230', '#36b37e', '#4f86f7', '#9b6ce0']


def tex_leather():
    n = kit.noise(512, 18, 3, 91)
    return save('leather', kit.tint(n, (110, 24, 52), (150, 40, 72)))


def tex_page(side):
    W, H = 600, 760
    img = Image.new('RGB', (W, H), (255, 250, 238))
    d = ImageDraw.Draw(img)
    for y in range(60, H, 34):
        d.line([(30, y), (W - 30, y)], fill=(236, 228, 210), width=2)
    # 世界地圖風的淡淡輪廓
    for k in range(9):
        cx, cy = 80 + (k * 137) % 460, 120 + (k * 211) % 560
        d.ellipse([cx - 60, cy - 30, cx + 60, cy + 30], outline=(232, 214, 196), width=3)
    f = ImageFont.truetype(kit.CJK_FONT, 42)
    if side == 0:
        d.text((40, 20), 'ENGLISH LEARNING PASSPORT', font=ImageFont.truetype(kit.CJK_FONT, 30), fill=(150, 40, 72))
    else:
        d.text((40, 20), '英語學習護照', font=f, fill=(150, 40, 72))
    return save(f'page_{side}', np.asarray(img))


def stamp_texture(i):
    W = 220
    img = Image.new('RGB', (W, W), (255, 250, 238))
    d = ImageDraw.Draw(img)
    col = kit.hexrgb(GRADE_COL[i])
    d.ellipse([10, 10, W - 10, W - 10], outline=col, width=10)
    d.ellipse([30, 30, W - 30, W - 30], outline=col, width=3)
    d.text((W / 2 - 34, 40), str(i + 1), font=ImageFont.truetype(kit.CJK_FONT, 110), fill=col)
    d.text((48, 150), 'GRADE', font=ImageFont.truetype(kit.CJK_FONT, 36), fill=col)
    return save(f'stamp_{i}', np.asarray(img))


material('leather', rough=0.65, tex=tex_leather())
material('gold', srgb('#e8c872'), rough=0.25, metal=0.95)
material('page_l', rough=0.9, tex=tex_page(0))
material('page_r', rough=0.9, tex=tex_page(1))
material('page_edge', srgb('#f4ead2'), rough=0.95)
material('paper_plane', srgb('#ffffff'), rough=0.7)
material('island_sand', srgb('#f2dfb0'), rough=0.95)
material('island_rock', srgb('#c9a97a'), rough=0.95)
material('headphone', srgb('#2a2f3a'), rough=0.35, metal=0.5)
material('headphone_pad', srgb(PINK), rough=0.6)
for i in range(6):
    material(f'stamp_{i}', rough=0.7, tex=stamp_texture(i))
    material(f'stamp_glow_{i}', srgb(GRADE_COL[i]), emit=srgb(GRADE_COL[i]), emit_strength=2.2)
for i, ch in enumerate('ABC'):
    material(f'letter_{i}', rough=0.5, tex=kit.label_texture(f'L{i}', ch, GRADE_COL[[0, 4, 3][i]], size=(160, 160), font_size=110))

# ── 攤開的護照書（取代方塊地塊） ──
BW, BD = 1.95, 3.4         # 單頁寬、高（x、y）
COVER = 0.06
for s in (-1, 1):
    box('cover', (BW + 0.1, BD + 0.14, COVER), (s * (BW / 2 + 0.03), 0, -0.25), 'leather', rot=(0, s * 0.06, 0), bevel=0.02)
    box('page_block', (BW - 0.04, BD - 0.02, 0.2), (s * (BW / 2 + 0.02), 0, -0.1), 'page_edge', rot=(0, s * 0.06, 0), bevel=0.02)
    label_block(f'page_top_{s}', (BW - 0.06, BD - 0.06, 0.012), (s * (BW / 2 + 0.02), 0, 0.006 + abs(s) * 0.0), 'page_l' if s < 0 else 'page_r',
                bevel=0.0, rot=(0, s * 0.06, 0))
    box('gold_edge', (0.02, BD + 0.14, 0.02), (s * (BW + 0.08), 0, -0.22), 'gold', bevel=0)
cyl('spine', 0.14, BD + 0.14, (0, 0, -0.22), 'leather', rot=(math.pi / 2, 0, 0), verts=24)
box('ribbon', (0.06, 0.02, 0.9), (0.15, -BD / 2 - 0.02, -0.45), 'headphone_pad', bevel=0)
# 書下方的雲朵（浮在空中的感覺）
for (x, y, z, r) in [(-1.6, -0.9, -0.55, 0.55), (1.4, 1.1, -0.6, 0.6), (0.2, -1.4, -0.65, 0.5), (-0.6, 1.3, -0.62, 0.45), (1.7, -1.3, -0.5, 0.4)]:
    ico('cloud', r, (x, y, z), 'paper_plane', sub=2, scale=(1.4, 1, 0.55))

# ── 六座年級小島與印章 ──
SPOTS = [(-1.35, 1.05), (-0.55, -0.15), (-1.3, -1.15), (0.6, 1.1), (1.4, 0.0), (0.65, -1.15)]
for i, (x, y) in enumerate(SPOTS):
    tilt = 0.06 if x > 0 else -0.06
    z = 0.02 + abs(x) * math.sin(abs(tilt)) * 0.0
    cyl('isle_rock', 0.36, 0.14, (x, y, z + 0.07), 'island_rock', verts=10, bevel=0.02)
    cyl('isle_sand', 0.38, 0.05, (x, y, z + 0.16), 'island_sand', verts=12, bevel=0.015)
    kit.tree((x + 0.22, y + 0.14, z + 0.18), s=0.32, kind='round' if i % 2 else 'pine')
    cyl('stamp_post', 0.025, 0.28, (x - 0.05, y, z + 0.32), 'gold', verts=8)
    label_block(f'stamp_disc_{i}', (0.42, 0.02, 0.42), (x - 0.05, y, z + 0.66), f'stamp_{i}', bevel=0.006, face='front', group=f'Billboard{i}')
    cyl(f'stamp_glow_{i}', 0.4, 0.015, (x, y, z + 0.19), f'stamp_glow_{i}', verts=24, group=f'Lit_{i}')
# 年級之間的虛線航線
for a, b in zip(SPOTS, SPOTS[1:] + SPOTS[:1]):
    for t in (0.33, 0.5, 0.67):
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        box('route_dash', (0.07, 0.03, 0.01), (x, y, 0.02), 'headphone_pad', rot=(0, 0, math.atan2(b[1] - a[1], b[0] - a[0])), bevel=0)

# ── 紙飛機（Spin）與英聽元素（Bob） ──
def paper_plane(loc, rot, group):
    x, y, z = loc
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.16, radius2=0, depth=0.42, location=(x, y, z), rotation=(0, math.pi / 2, 0))
    o = bpy.context.active_object
    o.scale = (1, 1, 0.25)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = rot
    return kit.finalize(o, 'paper_plane', group)


paper_plane((1.6, 0, 1.4), (0, math.pi / 2, math.pi / 2), 'Spin0')
paper_plane((-1.2, 0.6, 1.7), (0, math.pi / 2, -math.pi / 2), 'SpinR0')
for i in range(3):
    label_block(f'letter_{i}', (0.22, 0.22, 0.22), (-0.6 + i * 0.6, 0.25, 1.15 + (i % 2) * 0.2), f'letter_{i}', group=f'Bob{i}', bevel=0.03, face='front')
HX, HY, HZ = 0.0, 0.2, 1.75
kit.torus('headband', 0.32, 0.03, (HX, HY, HZ), 'headphone', rot=(math.pi / 2, 0, 0), group='Bob3', major=40, minor=8)
for s in (-1, 1):
    cyl('ear_cup', 0.13, 0.08, (HX + s * 0.32, HY, HZ - 0.08), 'headphone', rot=(0, math.pi / 2, 0), verts=20, group='Bob3')
    cyl('ear_pad', 0.11, 0.03, (HX + s * 0.27, HY, HZ - 0.08), 'headphone_pad', rot=(0, math.pi / 2, 0), verts=20, group='Bob3')

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'book')
for i, (x, y) in enumerate(SPOTS):
    kit.pivot(kit.merge_group(f'Billboard{i}', f'stamp{i}'), f'Billboard{i}', (x - 0.05, y, 0.68))
    kit.pivot(kit.merge_group(f'Lit_{i}', f'glow{i}'), f'Lit_{i}', (x, y, 0.21))
kit.pivot(kit.merge_group('Spin0', 'planeA'), 'Spin0', (0, 0, 0))
kit.pivot(kit.merge_group('SpinR0', 'planeB'), 'SpinR0', (0, 0, 0))
for i in range(4):
    kit.pivot(kit.merge_group(f'Bob{i}', f'float{i}'), f'Bob{i}', (0, 0, 0))
kit.export(OUT)
