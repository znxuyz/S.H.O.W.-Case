"""
《平板載具文件專區》—— 校務規範、表單與宣導文件，一處下載

專案核心：平板載具計畫的文件下載中心；分類卡片＋PDF / Word 雙格式下載；
          非工程背景的同仁上傳檔案、改一行設定就能新增文件。
主角：一台躺在桌墊上的巨大平板，螢幕亮著文件專區首頁；
      五類文件（校務規範 / 導師必備 / 表單下載 / 學生宣導 / 其他）從螢幕上浮起成五座懸浮書架，
      架上排著紅色 PDF 與藍色 Word 文件卡（Bob 上下浮動）；
      下載箭頭光束從螢幕射向使用者（Pulse）；觸控筆斜靠一旁。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'tablet.glb'
SHOT = os.environ.get('TABLET_SHOT', os.path.join(os.path.dirname(__file__), '../../public/media/tablet.webp'))
kit.reset()
kit.standard_materials()
kit.nature_materials()

CATS = [('校務規範', '#c2410c'), ('導師必備', '#2563eb'), ('表單下載', '#0f9b8e'), ('學生宣導', '#d946ef'), ('其他', '#64748b')]

material('mat', rough=0.95, tex=save('cutmat', kit.tint(kit.noise(512, 4, 3, 101), (28, 72, 88), (40, 92, 108))))
material('mat_dark', srgb('#12323e'), rough=0.9)
material('alu', srgb('#c7ccd4'), rough=0.25, metal=0.9)
material('bezel', srgb('#15171c'), rough=0.3)
material('pen', srgb('#f4f5f7'), rough=0.3)
material('pen_tip', srgb('#2a2c33'), rough=0.4)
material('shelf', srgb('#e8eef6'), rough=0.4, metal=0.1)
material('shelf_glow', srgb('#9fe8ff'), emit=srgb('#7fdcff'), emit_strength=3)
material('beam', srgb('#9fe8ff'), emit=srgb('#7fdcff'), emit_strength=0.8, alpha=0.12)
material('arrow', srgb('#ffffff'), emit=srgb('#bff3ff'), emit_strength=4)

# 螢幕：用專案實際截圖（public/media/tablet.webp）
im = Image.open(SHOT).convert('RGB').resize((1024, 640))
material('screen', rough=0.2, tex=save('tablet_screen', np.asarray(im)), emit=srgb('#ffffff'), emit_strength=0.12, emit_tex=True)


def doc_texture(kind, i):
    W, H = 150, 200
    col = (220, 60, 50) if kind == 'pdf' else (43, 108, 230)
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.polygon([(W - 40, 0), (W, 40), (W - 40, 40)], fill=(225, 228, 234))
    d.rectangle([0, H - 62, W, H], fill=col)
    d.text((18, H - 56), 'PDF' if kind == 'pdf' else 'DOC', font=ImageFont.truetype(kit.CJK_FONT, 44), fill=(255, 255, 255))
    for k in range(5):
        d.line([(16, 24 + k * 20), (W - 50 if k == 0 else W - 16, 24 + k * 20)], fill=(200, 205, 214), width=5)
    return save(f'doc_{kind}_{i}', np.asarray(img))


material('doc_pdf', rough=0.6, tex=doc_texture('pdf', 0))
material('doc_word', rough=0.6, tex=doc_texture('word', 0))
for i, (name, col) in enumerate(CATS):
    material(f'cat_{i}', rough=0.5, tex=kit.label_texture(f'cat{i}', name, col, size=(300, 110), font_size=56))

# ── 桌墊地塊 ──
kit.plinth('mat', soil_mat='mat_dark', rock_mat='mat_dark', rim_mat='alu')

# ── 平板本體（平躺，螢幕朝上） ──
TW, TD, TT = 2.7, 1.9, 0.08
TX, TY = 0.05, -0.35
box('tablet_body', (TW, TD, TT), (TX, TY, 0.06), 'alu', bevel=0.06, segs=4)
box('tablet_bezel', (TW - 0.06, TD - 0.06, 0.01), (TX, TY, 0.105), 'bezel', bevel=0.02)
label_block('tablet_screen', (TW - 0.2, TD - 0.2, 0.006), (TX, TY, 0.112), 'screen', bevel=0)
cyl('camera_dot', 0.02, 0.01, (TX, TY + TD / 2 - 0.05, 0.112), 'pen_tip', verts=10)
# 觸控筆
beam('pencil', (TX + 1.55, TY - 0.9, 0.04), (TX + 1.45, TY + 0.9, 0.04), 0.06, 'pen', round_=True)
cone('pencil_tip', 0.03, 0.0, 0.1, (TX + 1.56, TY - 0.97, 0.04), 'pen_tip', verts=10, rot=(math.pi / 2, 0, 0.05))

# ── 從螢幕升起的五座懸浮書架 ──
SHELVES = [(-1.1, 0.9, 1.05), (-0.25, 1.15, 1.45), (0.65, 1.15, 1.25), (1.45, 0.85, 0.95), (0.25, 0.45, 2.0)]
for i, (x, y, z) in enumerate(SHELVES):
    g = f'Bob{i}'
    box('shelf_board', (1.0, 0.36, 0.04), (x, y, z), 'shelf', group=g, bevel=0.012)
    box('shelf_edge', (1.0, 0.015, 0.014), (x, y - 0.18, z + 0.014), 'shelf_glow', group=g, bevel=0)
    label_block(f'cat_label_{i}', (0.66, 0.02, 0.24), (x, y - 0.19, z - 0.14), f'cat_{i}', group=g, bevel=0.004, face='front')
    for k in range(4):
        kind = 'doc_pdf' if (k + i) % 2 == 0 else 'doc_word'
        label_block(f'doc_{i}_{k}', (0.2, 0.02, 0.27), (x - 0.345 + k * 0.23, y, z + 0.16), kind, group=g, bevel=0.003, face='front',
                    rot=(0, 0, (k - 1.5) * 0.06))
    beam('tether', (x, y, z - 0.02), (TX + (x - TX) * 0.3, TY + (y - TY) * 0.3, 0.12), 0.008, 'shelf_glow', round_=True)

# ── 下載光束與箭頭 ──
cone('download_beam', 0.55, 0.2, 1.2, (TX - 0.2, TY - 0.2, 0.72), 'beam', verts=32)
cone('download_arrow', 0.16, 0.0, 0.2, (TX - 0.2, TY - 0.2, 0.55), 'arrow', verts=4, rot=(math.pi, 0, math.pi / 4), group='Pulse0')
box('download_shaft', (0.08, 0.08, 0.26), (TX - 0.2, TY - 0.2, 0.78), 'arrow', group='Pulse0', bevel=0.01)

# 桌面小物：植物、馬克杯
cyl('pot', 0.13, 0.18, (-1.6, 1.55, 0.09), 'alu', verts=16)
kit.tree((-1.6, 1.55, 0.16), s=0.45)
cyl('mug', 0.12, 0.2, (1.6, 1.55, 0.1), 'shelf', verts=20, bevel=0.01)
kit.torus('mug_handle', 0.07, 0.018, (1.72, 1.55, 0.1), 'shelf', rot=(math.pi / 2, 0, 0), major=20, minor=6)

# ── 細節：維護說明書、文件數計數器、上傳托盤、耳機與便利貼 ──
kit.detail_materials()
material('manual', rough=0.6, tex=kit.label_texture('manual', '維護說明\n改一行就上線', '#c2410c', size=(240, 300), font_size=38))
material('counter', rough=0.4, tex=kit.label_texture('count', '文件 48 份', '#0b2433', fg=(159, 232, 255), size=(260, 100), font_size=46), emit=srgb('#ffffff'), emit_strength=0.8, emit_tex=True)
material('tray_m', srgb('#c7ccd4'), rough=0.3, metal=0.8)
material('note', srgb('#ffe27a'), rough=0.8)
# 維護說明書（右前方立著）
kit.label_block('manual', (0.36, 0.05, 0.46), (1.55, -1.45, 0.24), 'manual', bevel=0.01, face='front', rot=(-0.2, 0, 0.35))
# 文件數計數器（平板旁的小螢幕）
box('counter_body', (0.5, 0.12, 0.22), (-1.45, -1.55, 0.13), 'bezel', rot=(0, 0, -0.3), bevel=0.02)
kit.label_block('counter_screen', (0.44, 0.02, 0.17), (-1.43, -1.62, 0.14), 'counter', bevel=0, face='front', rot=(0, 0, -0.3))
# 上傳托盤：一疊待上傳文件
box('upload_tray', (0.5, 0.36, 0.05), (1.5, 0.75, 0.03), 'tray_m', bevel=0.01)
for k in range(4):
    kit.label_block(f'tray_doc_{k}', (0.2, 0.27, 0.012), (1.42 + k * 0.03, 0.75 + k * 0.01, 0.07 + k * 0.014), 'doc_pdf' if k % 2 else 'doc_word', bevel=0, rot=(0, 0, k * 0.08))
# 便利貼
for k in range(3):
    box('sticky', (0.13, 0.13, 0.008), (-0.95 + k * 0.17, 0.95, 0.12), 'note', rot=(0, 0, k * 0.2 - 0.2), bevel=0)

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'desk')
for i, (x, y, z) in enumerate(SHELVES):
    kit.pivot(kit.merge_group(f'Bob{i}', f'shelf{i}'), f'Bob{i}', (x, y, z))
kit.pivot(kit.merge_group('Pulse0', 'arrow'), 'Pulse0', (TX - 0.2, TY - 0.2, 0.66))
kit.export(OUT)
