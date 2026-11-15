"""
《拉普拉斯預測核心 L.P.L.C.》—— 如果知道現在的一切，就能推算未來

專案核心：把台股的行情、籌碼、財報轉成看得懂的畫面（熱力圖、型態辨識、選股），
          並能「回到過去」做歷史回放模擬交易。
主角：懸浮在「立體熱力圖地形」上的拉普拉斯之眼——
      · 地形：各產業分區的方塊，高度＝成交額、顏色＝漲跌（紅漲綠跌）
      · 水晶球裡的虹膜永遠注視著觀看者（Billboard）
      · 環繞的發光報價跑馬燈（Spin）、漂浮的 K 線（Bob）
      · 地面一圈逆時針轉的「回到過去」時間環（SpinR）＝歷史回放模擬盤
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, box, cone, cyl, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'lplc.glb'
kit.reset()
kit.standard_materials()


def tex_techfloor():
    W = 512
    img = Image.new('RGB', (W, W), (8, 20, 32))
    d = ImageDraw.Draw(img)
    for i in range(0, W, 32):
        d.line([(i, 0), (i, W)], fill=(18, 52, 72))
        d.line([(0, i), (W, i)], fill=(18, 52, 72))
    return save('techfloor', np.asarray(img))


def tex_ticker():
    W, H = 2048, 96
    img = Image.new('RGB', (W, H), (2, 10, 18))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(kit.CJK_FONT, 54)
    items = [('2330', '▲1.85', 1), ('2454', '▲3.20', 1), ('2603', '▼0.95', 0), ('2881', '▲0.42', 1), ('3231', '▲6.10', 1),
             ('0050', '▲1.12', 1), ('2317', '▼0.38', 0), ('6669', '▲4.75', 1), ('2412', '▼0.21', 0)]
    x = 20
    for code, chg, up in items:
        d.text((x, 16), code, font=f, fill=(159, 243, 255))
        x += 150
        d.text((x, 16), chg, font=f, fill=(255, 80, 120) if up else (0, 230, 160))
        x += 180
    return save('ticker', np.asarray(img))


def tex_iris():
    W = 512
    yy, xx = np.mgrid[0:W, 0:W]
    r = np.hypot(xx - W / 2, yy - W / 2) / (W / 2)
    ang = np.arctan2(yy - W / 2, xx - W / 2)
    rays = (np.sin(ang * 48) * 0.5 + 0.5) * 0.35
    col = np.zeros((W, W, 3), np.float32)
    iris = np.clip(1 - r, 0, 1)
    col[..., 0] = 20 + 60 * iris + rays * 40
    col[..., 1] = 120 + 120 * iris + rays * 80
    col[..., 2] = 180 + 75 * iris + rays * 60
    col[r < 0.32] = (4, 8, 14)                                  # 瞳孔
    col[(r > 0.92) & (r < 1.0)] = (255, 61, 242)                # 外圈霓虹
    col[r >= 1.0] = (2, 6, 12)
    hl = np.hypot(xx - W * 0.4, yy - W * 0.38) < W * 0.06      # 高光
    col[hl] = (240, 255, 255)
    return save('iris', col)


material('techfloor', rough=0.6, metal=0.3, tex=tex_techfloor())
material('frame', srgb('#163049'), rough=0.35, metal=0.7)
material('glass', srgb('#9fe8ff'), rough=0.04, alpha=0.22)
material('core', srgb('#bff7ff'), emit=srgb('#22e4ff'), emit_strength=5)
material('iris', rough=0.3, tex=tex_iris(), emit=srgb('#ffffff'), emit_strength=1.6, emit_tex=True)
material('ticker', rough=0.4, tex=tex_ticker(), emit=srgb('#ffffff'), emit_strength=2.2, emit_tex=True)
material('neon_c', srgb('#22e4ff'), emit=srgb('#22e4ff'), emit_strength=4)
material('neon_m', srgb('#ff3df2'), emit=srgb('#ff3df2'), emit_strength=4)
material('beam', srgb('#22e4ff'), emit=srgb('#22e4ff'), emit_strength=0.5, alpha=0.06)
TIERS = {  # 台股：紅漲綠跌
    'up3': '#ff2d55', 'up2': '#d63a5a', 'up1': '#9c3a52', 'flat': '#34465a', 'dn1': '#1f7a63', 'dn2': '#13a37a', 'dn3': '#00d68f',
}
for k, c in TIERS.items():
    material(f'heat_{k}', srgb(c), rough=0.35, metal=0.2, emit=srgb(c), emit_strength=0.35)
    material(f'cap_{k}', srgb(c), emit=srgb(c), emit_strength=2.6)
for i, name in enumerate(['半導體', 'AI 伺服器', '航運', '金融', '電子零組件', '生技']):
    material(f'sector_{i}', rough=0.4, tex=kit.label_texture(f's{i}', name, '#0a1a28', fg=(159, 243, 255), size=(320, 120), font_size=56))

# ── 地塊（科技底座） ──
kit.plinth('techfloor', soil_mat='frame', rock_mat='frame', rim_mat='frame')
for (sx, sy, x, y) in [(4.0, 0.03, 0, 1.92), (4.0, 0.03, 0, -1.92), (0.03, 3.84, 1.92, 0), (0.03, 3.84, -1.92, 0)]:
    box('rim_neon', (sx, sy, 0.03), (x, y, 0.02), 'neon_c', bevel=0)

# ── 立體熱力圖地形（依產業分區） ──
rng = kit.rng
SECTORS = [  # (x0, y0, w, h, 偏多程度)
    (-1.75, -0.2, 1.75, 1.85, 0.75),   # 半導體（最大）
    (0.1, 0.55, 1.6, 1.1, 0.85),       # AI 伺服器
    (0.1, -0.35, 0.8, 0.8, 0.25),      # 航運
    (1.0, -0.35, 0.7, 0.8, 0.55),      # 金融
    (-1.75, -1.75, 1.6, 1.4, 0.5),     # 電子零組件
    (0.0, -1.75, 1.7, 1.25, 0.35),     # 生技
]


def tier(bias):
    v = rng.random() * 0.8 + bias * 0.6 - 0.35
    for k, thr in [('up3', 0.75), ('up2', 0.55), ('up1', 0.4), ('flat', 0.3), ('dn1', 0.18), ('dn2', 0.06)]:
        if v > thr:
            return k
    return 'dn3'


def split(x0, y0, w, h, depth, out):
    """簡易 treemap：遞迴切割成大小不一的個股方塊"""
    if depth == 0 or (w < 0.42 and h < 0.42):
        out.append((x0, y0, w, h))
        return
    if w > h:
        k = 0.35 + rng.random() * 0.3
        split(x0, y0, w * k, h, depth - 1, out)
        split(x0 + w * k, y0, w * (1 - k), h, depth - 1, out)
    else:
        k = 0.35 + rng.random() * 0.3
        split(x0, y0, w, h * k, depth - 1, out)
        split(x0, y0 + h * k, w, h * (1 - k), depth - 1, out)


for si, (x0, y0, w, h, bias) in enumerate(SECTORS):
    tiles = []
    split(x0, y0, w, h, 4, tiles)
    for (tx, ty, tw, th) in tiles:
        area = tw * th
        height = 0.08 + min(1.0, area * 1.6) * (0.35 + rng.random() * 0.9)
        t = tier(bias)
        gap = 0.035
        cx, cy = tx + tw / 2, ty + th / 2
        box('stock', (tw - gap, th - gap, height), (cx, cy, height / 2), f'heat_{t}', bevel=0.012, segs=1)
        box('stock_cap', (tw - gap - 0.02, th - gap - 0.02, 0.012), (cx, cy, height + 0.006), f'cap_{t}', bevel=0)
    label_block(f'sector_label_{si}', (min(0.62, w * 0.6), 0.02, 0.22), (x0 + w / 2, y0 - 0.02, 0.15), f'sector_{si}', bevel=0.004, face='front')

# ── 拉普拉斯之眼 ──
EX, EY, EZ = 0.0, 0.1, 2.55
kit.sphere('eye_glass', 0.55, (EX, EY, EZ), 'glass', seg=40, rings=24, group='Pulse0')
kit.sphere('eye_core', 0.16, (EX, EY, EZ), 'core', seg=20, rings=12, group='Pulse0')
cyl('iris_disc', 0.36, 0.02, (EX, EY - 0.05, EZ), 'iris', rot=(math.pi / 2, 0, 0), verts=48, group='Billboard0')
iris = kit.GROUPS['Billboard0'][-1]
for poly in iris.data.polygons:
    for li in poly.loop_indices:
        v = iris.data.vertices[iris.data.loops[li].vertex_index].co
        w = iris.matrix_world @ v
        iris.data.uv_layers.active.data[li].uv = ((w.x - EX) / 0.72 + 0.5, (w.z - EZ) / 0.72 + 0.5)
kit.torus('eye_ring_a', 0.78, 0.016, (EX, EY, EZ), 'neon_c', rot=(1.2, 0, 0.3), group='Spin0', major=64, minor=8)
kit.torus('eye_ring_b', 0.92, 0.012, (EX, EY, EZ), 'neon_m', rot=(1.9, 0.4, 0), group='SpinR0', major=64, minor=8)
# 報價跑馬燈（圓環帶）
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.25, depth=0.14, location=(EX, EY, EZ - 0.75), end_fill_type='NOTHING')
band = bpy.context.active_object
kit.finalize(band, 'ticker', group='Spin1', uv=False)
# 掃描光錐
cone('scan_beam', 1.5, 0.05, 2.0, (EX, EY, EZ - 1.25), 'beam', verts=32, group='static')
# 漂浮 K 線
for i in range(7):
    a = i / 7 * math.tau
    x, y, z = EX + math.cos(a) * 1.55, EY + math.sin(a) * 1.55, EZ - 0.2 + (i % 3) * 0.22
    up = i % 3 != 1
    body = 0.16 + (i % 2) * 0.12
    box('candle_body', (0.08, 0.08, body), (x, y, z), 'cap_up3' if up else 'cap_dn3', group=f'Bob{i}', bevel=0.005)
    box('candle_wick', (0.015, 0.015, body + 0.16), (x, y, z), 'cap_up2' if up else 'cap_dn2', group=f'Bob{i}', bevel=0)
# 回到過去：地面的逆時針時間環 + 箭頭
kit.torus('rewind_ring', 1.85, 0.02, (0, 0, 0.04), 'neon_m', group='SpinR1', major=96, minor=6)
for k in range(3):
    a = k / 3 * math.tau
    cone('rewind_arrow', 0.08, 0.0, 0.18, (math.cos(a) * 1.85, math.sin(a) * 1.85, 0.04), 'neon_m', verts=3,
         rot=(0, math.pi / 2, a - math.pi / 2), group='SpinR1')

# ── 細節：K 線型態面板、五大選股濾鏡、ETF 籃子、資料塔 ──
def tex_pattern():
    W, H = 512, 300
    img = Image.new('RGB', (W, H), (4, 14, 24))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 32):
        d.line([(x, 0), (x, H)], fill=(12, 40, 56))
    v = 160.0
    rng2 = kit.random.Random(9)
    for k in range(24):
        o = v; v += (rng2.random() - 0.46) * 26; c = v
        hi, lo = max(o, c) + rng2.random() * 12, min(o, c) - rng2.random() * 12
        x = 18 + k * 20
        col = (255, 61, 110) if c < o else (0, 230, 160)
        d.line([(x, H - hi), (x, H - lo)], fill=col, width=2)
        d.rectangle([x - 6, H - max(o, c), x + 6, H - min(o, c)], fill=col)
    d.rectangle([250, 40, 420, 240], outline=(255, 214, 102), width=4)
    d.text((262, 46), 'W 底 · 勝率 68%', font=ImageFont.truetype(kit.CJK_FONT, 26), fill=(255, 214, 102))
    return save('pattern', np.asarray(img)[::-1] if False else np.asarray(img))


material('pattern', rough=0.4, tex=tex_pattern(), emit=srgb('#ffffff'), emit_strength=1.4, emit_tex=True)
material('lens', srgb('#9fe8ff'), rough=0.05, alpha=0.25)
for i, (name, col) in enumerate([('低基期', '#22e4ff'), ('動能', '#ff3df2'), ('高股息', '#ffd166'), ('事件', '#7fff9f'), ('籌碼', '#b98cff')]):
    material(f'lens_{i}', srgb(col), emit=srgb(col), emit_strength=3)
material('etf_label', rough=0.4, tex=kit.label_texture('etf', 'ETF', '#0a1a28', fg=(159, 243, 255), size=(200, 120), font_size=70), emit=srgb('#ffffff'), emit_strength=1.2, emit_tex=True)
# K 線型態面板（後方右側，立在支架上）
KPX, KPY = 1.25, 1.55
label_block('pattern_panel', (1.2, 0.03, 0.7), (KPX, KPY, 1.05), 'pattern', bevel=0.006, face='front', group='Fx_kline')
box('panel_frame', (1.26, 0.025, 0.76), (KPX, KPY + 0.02, 1.05), 'frame', bevel=0.008, group='Fx_kline')
for dx in (-0.5, 0.5):
    cyl('panel_leg', 0.02, 0.7, (KPX + dx, KPY + 0.03, 0.35), 'frame', verts=6, group='Fx_kline')
# 五大選股濾鏡：五片疊起的發光鏡環（左前方）
FLX, FLY = -1.45, -1.3
for i in range(5):
    kit.torus(f'lens_ring_{i}', 0.32 - i * 0.02, 0.018, (FLX, FLY, 0.3 + i * 0.18), f'lens_{i}', group='SpinR2', major=32, minor=6)
    cyl(f'lens_disc_{i}', 0.3 - i * 0.02, 0.006, (FLX, FLY, 0.3 + i * 0.18), 'lens', verts=24, group='SpinR2')
kit.sphere('lens_pick', 0.06, (FLX, FLY, 1.25), 'cap_up3', seg=12, rings=8, group='Bob9')
# ETF 籃子：由小方塊組成的立方體（左後方）
ETX, ETY = -1.5, 1.45
for a in range(3):
    for b in range(3):
        for c in range(3):
            if (a + b + c) % 2 == 0 or c == 2:
                box('etf_cell', (0.13, 0.13, 0.13), (ETX - 0.15 + a * 0.15, ETY - 0.15 + b * 0.15, 0.1 + c * 0.15), ['heat_up2', 'heat_dn2', 'heat_flat'][(a + b + c) % 3], bevel=0.01, segs=1)
label_block('etf_tag', (0.3, 0.02, 0.18), (ETX, ETY - 0.26, 0.62), 'etf_label', bevel=0.004, face='front')
# 資料塔（四角，帶閃爍燈）
for (x, y) in [(1.8, 1.8), (-1.8, 1.8), (1.8, -1.8), (-1.8, -1.8)]:
    cyl('pylon', 0.04, 0.9, (x, y, 0.45), 'frame', verts=6)
    cone('pylon_tip', 0.07, 0.0, 0.16, (x, y, 0.98), 'neon_c', verts=6)
    kit.sphere('pylon_led', 0.03, (x, y, 0.75), 'neon_m', seg=8, rings=5)

# ── 點擊動畫節點（熱點附近的零件抽出成 Fx_ 節點） ──
kit.fx_around('Fx_heat', -0.8, 0.6, r=0.55, z0=0.03, z1=1.0, exclude=())
kit.fx_node('Fx_kline', (KPX, KPY, 0.0))
kit.fx_extract('Fx_etf', (ETX - 0.3, ETY - 0.3, 0.03), (ETX + 0.3, ETY + 0.3, 0.75), max_size=0.5, exclude=('stock',))
kit.fx_node('Fx_etf', (ETX, ETY, 0.0))

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'terrain')
kit.pivot(kit.merge_group('Pulse0', 'eye'), 'Pulse0', (EX, EY, EZ))
kit.pivot(kit.merge_group('Billboard0', 'iris'), 'Billboard0', (EX, EY, EZ))
kit.pivot(kit.merge_group('Spin0', 'ringa'), 'Spin0', (EX, EY, EZ))
kit.pivot(kit.merge_group('SpinR0', 'ringb'), 'SpinR0', (EX, EY, EZ))
kit.pivot(kit.merge_group('Spin1', 'ticker'), 'Spin1', (EX, EY, EZ - 0.75))
kit.pivot(kit.merge_group('SpinR1', 'rewind'), 'SpinR1', (0, 0, 0.04))
kit.pivot(kit.merge_group('SpinR2', 'lenses'), 'SpinR2', (FLX, FLY, 0))
kit.pivot(kit.merge_group('Bob9', 'pick'), 'Bob9', (FLX, FLY, 1.25))
for i in range(7):
    a = i / 7 * math.tau
    kit.pivot(kit.merge_group(f'Bob{i}', f'candle{i}'), f'Bob{i}', (EX + math.cos(a) * 1.55, EY + math.sin(a) * 1.55, EZ - 0.2 + (i % 3) * 0.22))
kit.export(OUT)
