"""
《神獸股市》—— 買股票召喚神獸，持股越久，魂環越盛

專案核心：真實台股投資組合 → 上古神祇動物園。買進新股＝召喚神獸；
          等級＝累積投入、魂環境界（凡靈妖神聖仙）＝持有時間、魂環特效＝報酬率。
主角：召喚祭壇。中央八卦召喚陣上，一張股票憑證（2330）正在發光——
      十日金烏（專案原創立繪）從陣中升起（Billboard），身後套著層層魂環（Spin / SpinR）。
      祭壇四周六根境界石柱由低到高，柱頂懸著專案的六種魂環寶珠：凡→靈→妖→神→聖→仙。
      其他神獸立繪在外圈環繞（Spin），代表圖鑑。
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import Image, ImageDraw, ImageFont, beam, box, cone, cyl, ico, label_block, material, np, save, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'stockgame.glb'
ASSETS = os.environ.get('STOCKGAME_DIR', '/home/user/znxuyz/stockgame/public')
kit.reset()
kit.standard_materials()


def tex_violet_stone():
    n = kit.noise(512, 6, 5, 51)
    vein = (np.abs(np.sin((kit.noise(512, 3, 3, 52) * 9) * math.pi)) < 0.06) * 0.6
    return save('violet', kit.tint(np.clip(n * 0.8 + vein, 0, 1), (46, 26, 82), (98, 64, 150)))


def tex_sigil():
    W = 1024
    img = Image.new('RGB', (W, W), (24, 12, 44))
    d = ImageDraw.Draw(img)
    gold = (255, 205, 120)
    c = W / 2
    for r, w in [(490, 6), (430, 3), (300, 4), (180, 3)]:
        d.ellipse([c - r, c - r, c + r, c + r], outline=gold, width=w)
    tri = [(c + 300 * math.cos(a), c + 300 * math.sin(a)) for a in [-math.pi / 2 + k * 2 * math.pi / 3 for k in range(3)]]
    d.polygon(tri, outline=gold)
    d.polygon([(2 * c - x, 2 * c - y) for x, y in tri], outline=gold)
    f = ImageFont.truetype(kit.CJK_FONT, 58)
    for k, ch in enumerate('乾兌離震巽坎艮坤'):
        a = -math.pi / 2 + k * math.tau / 8
        x, y = c + 460 * math.cos(a), c + 460 * math.sin(a)
        d.text((x - 30, y - 34), ch, font=f, fill=gold)
    for k in range(64):
        a = k * math.tau / 64
        d.line([(c + 400 * math.cos(a), c + 400 * math.sin(a)), (c + 420 * math.cos(a), c + 420 * math.sin(a))], fill=gold, width=3)
    return save('sigil', np.asarray(img))


def tex_stock_card():
    W, H = 360, 480
    img = Image.new('RGB', (W, H), (250, 238, 210))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, W - 10, H - 10], outline=(180, 120, 40), width=8)
    d.rectangle([24, 24, W - 24, H - 24], outline=(210, 160, 70), width=3)
    f1 = ImageFont.truetype(kit.CJK_FONT, 90)
    f2 = ImageFont.truetype(kit.CJK_FONT, 46)
    f3 = ImageFont.truetype(kit.CJK_FONT, 40)
    d.text((W / 2 - 100, 60), '2330', font=f1, fill=(130, 40, 30))
    d.text((W / 2 - 92, 180), '召喚契約', font=f2, fill=(90, 50, 20))
    d.text((W / 2 - 80, 260), '十日金烏', font=f3, fill=(170, 100, 20))
    d.text((W / 2 - 84, 330), 'Lv. 42', font=f3, fill=(170, 40, 40))
    d.ellipse([W / 2 - 46, 380, W / 2 + 46, 450], outline=(200, 40, 30), width=6)
    d.text((W / 2 - 20, 390), '印', font=f3, fill=(200, 40, 30))
    return save('stockcard', np.asarray(img))


material('violet', rough=0.7, tex=tex_violet_stone())
material('violet_dark', srgb('#24123f'), rough=0.85)
material('gold', srgb('#ffc76b'), rough=0.25, metal=0.95)
material('sigil', rough=0.6, tex=tex_sigil(), emit=srgb('#ffffff'), emit_strength=1.1, emit_tex=True)
material('card', rough=0.6, tex=tex_stock_card(), emit=srgb('#ffffff'), emit_strength=0.5, emit_tex=True)
material('spirit_gold', srgb('#ffe2a0'), emit=srgb('#ffc76b'), emit_strength=6)
material('spirit_violet', srgb('#d8b8ff'), emit=srgb('#b98cff'), emit_strength=5)
material('pillar_glow', srgb('#7fd8ff'), emit=srgb('#7fd8ff'), emit_strength=3)
material('beam', srgb('#ffd98a'), emit=srgb('#ffc76b'), emit_strength=0.35, alpha=0.05)
TIERS = ['凡', '靈', '妖', '神', '聖', '仙']
for i, t in enumerate(TIERS):
    material(f'tier_{i}', rough=0.4, tex=kit.label_texture(f't{i}', t, '#2a1745', fg=(255, 214, 140), size=(160, 160), font_size=96))

kit.plinth('violet', soil_mat='violet_dark', rock_mat='violet_dark', rim_mat='gold')

# ── 三層祭壇與召喚陣 ──
for i, (s, h) in enumerate([(3.0, 0.16), (2.4, 0.16), (1.85, 0.14)]):
    z = sum(hh for _, hh in [(3.0, 0.16), (2.4, 0.16), (1.85, 0.14)][:i])
    cyl(f'altar_{i}', s / 2, h, (0, 0, z + h / 2), 'violet', verts=8, bevel=0.02)
    kit.torus(f'altar_trim_{i}', s / 2 + 0.005, 0.014, (0, 0, z + h), 'gold', major=8, minor=6)
TOP = 0.46
bpy.ops.mesh.primitive_circle_add(vertices=64, radius=0.88, fill_type='NGON', location=(0, 0, TOP + 0.004))
sig = bpy.context.active_object
kit.finalize(sig, 'sigil', uv=False)
for poly in sig.data.polygons:
    for li in poly.loop_indices:
        v = sig.data.vertices[sig.data.loops[li].vertex_index].co
        sig.data.uv_layers.active.data[li].uv = (v.x / 1.76 + 0.5, v.y / 1.76 + 0.5)
# 四座階梯
for k in range(4):
    a = k * math.pi / 2
    for s in range(3):
        r = 1.6 - s * 0.28
        box('stair', (0.5, 0.26, 0.16), (math.cos(a) * r, math.sin(a) * r, 0.08 + s * 0.15), 'violet', rot=(0, 0, a + math.pi / 2), bevel=0.012)

# 股票契約卡（召喚媒介），浮在陣中央
label_block('stock_card', (0.36, 0.02, 0.48), (0, -0.05, TOP + 0.42), 'card', group='Bob0', bevel=0.006, face='front')
kit.torus('card_halo', 0.36, 0.01, (0, -0.05, TOP + 0.42), 'spirit_gold', rot=(math.pi / 2, 0, 0), group='Bob0', major=40, minor=6)
cone('summon_beam', 0.8, 0.45, 1.2, (0, 0, TOP + 0.6), 'beam', verts=40)

# ── 主角：十日金烏 + 魂環 ──
HZ = TOP + 2.15
kit.image_card('beast_main', os.path.join(ASSETS, 'sprites/shi-ri-jin-wu.png'), 2.15, (0, 0, HZ), group='Billboard0')
kit.torus('soul_ring_a', 1.05, 0.02, (0, 0, HZ - 0.55), 'spirit_gold', group='Spin0', major=72, minor=8)
kit.torus('soul_ring_b', 1.22, 0.014, (0, 0, HZ - 0.35), 'spirit_violet', rot=(0.18, 0, 0), group='SpinR0', major=72, minor=8)
kit.torus('soul_ring_c', 0.9, 0.012, (0, 0, HZ - 0.75), 'spirit_gold', rot=(-0.12, 0.1, 0), group='SpinR1', major=72, minor=8)
for k in range(6):
    a = k * math.tau / 6
    kit.sphere('ring_bead', 0.045, (math.cos(a) * 1.05, math.sin(a) * 1.05, HZ - 0.55), 'spirit_gold', seg=10, rings=6, group='Spin0')

# ── 六根境界石柱（凡→仙，持有越久越高） ──
for i in range(6):
    a = math.radians(210 - i * 48)
    x, y = math.cos(a) * 1.62, math.sin(a) * 1.62
    h = 0.35 + i * 0.16
    cyl('tier_pillar', 0.13, h, (x, y, h / 2), 'violet', verts=8, bevel=0.012)
    kit.torus('tier_band', 0.135, 0.012, (x, y, h * 0.7), 'pillar_glow', major=24, minor=6)
    cyl('tier_cap', 0.17, 0.05, (x, y, h + 0.025), 'gold', verts=8, bevel=0.008)
    label_block(f'tier_label_{i}', (0.16, 0.02, 0.16), (x, y - 0.14, h * 0.45), f'tier_{i}', bevel=0.004, face='front', rot=(0, 0, a - math.radians(270)))
    ring = ['fan', 'ling', 'yao', 'shen', 'sheng', 'xian'][i]
    kit.image_card(f'orb_{i}', os.path.join(ASSETS, f'assets/rings/ring-{ring}.png'), 0.32 + i * 0.02, (x, y, h + 0.26), group=f'Billboard{1 + i}')

# ── 外圈：圖鑑神獸環繞 ──
OTHERS = ['zhang-yu-mo-huang', 'bing-jing-die-xian', 'jing-ge-shen-yuan', 'ba-gua-jing-dun']
for i, n in enumerate(OTHERS):
    a = i * math.tau / len(OTHERS) + 0.4
    kit.image_card(f'codex_{i}', os.path.join(ASSETS, f'sprites/{n}.png'), 0.62, (math.cos(a) * 2.35, math.sin(a) * 2.35, 2.2 + (i % 2) * 0.35), group=f'Billboard{7 + i}')

# 靈晶碎石
for (x, y, r) in [(1.75, 1.6, 0.16), (-1.7, 1.65, 0.13), (1.65, -1.7, 0.12), (-1.75, -1.55, 0.15)]:
    ico('shard', r, (x, y, r), 'spirit_violet', sub=0, scale=(0.6, 0.6, 1.6))

# ── 細節：報價玉碑、神祇圖鑑、修為火盆與任務卷軸 ──
material('jade', srgb('#5fb3a0'), rough=0.25, metal=0.1)
material('flame', srgb('#ffcf6a'), emit=srgb('#ff9a3a'), emit_strength=6)
material('flame_v', srgb('#d8b8ff'), emit=srgb('#b98cff'), emit_strength=5)
material('codex_cover', srgb('#4b2a6a'), rough=0.6)


def tex_quote():
    W, H = 300, 420
    img = Image.new('RGB', (W, H), (20, 52, 46))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(kit.CJK_FONT, 40)
    d.text((28, 18), '盤中報價', font=f, fill=(232, 255, 240))
    for k, (code, chg, up) in enumerate([('2330', '▲1.85', 1), ('2454', '▲3.20', 1), ('2603', '▼0.95', 0), ('0050', '▲1.12', 1), ('2317', '▼0.38', 0)]):
        y = 90 + k * 62
        d.text((28, y), code, font=f, fill=(200, 240, 225))
        d.text((150, y), chg, font=f, fill=(255, 110, 130) if up else (90, 230, 170))
    return save('quote', np.asarray(img))


def tex_codex():
    W, H = 640, 400
    img = Image.new('RGB', (W, H), (250, 238, 210))
    d = ImageDraw.Draw(img)
    d.line([(W / 2, 0), (W / 2, H)], fill=(180, 150, 110), width=4)
    f = ImageFont.truetype(kit.CJK_FONT, 34)
    d.text((40, 20), '神祇圖鑑', font=f, fill=(110, 50, 30))
    d.text((360, 20), '294 / 294', font=f, fill=(110, 50, 30))
    for k in range(12):
        x = 40 + (k % 4) * 66 + (300 if k % 8 >= 4 else 0) * 0
        x = (40 if k < 6 else 360) + (k % 3) * 82
        y = 90 + ((k % 6) // 3) * 140
        d.rounded_rectangle([x, y, x + 70, y + 110], radius=10, outline=(150, 100, 60), width=3, fill=(240, 222, 188))
    return save('codex', np.asarray(img))


def tex_scroll():
    W, H = 200, 460
    img = Image.new('RGB', (W, H), (246, 234, 206))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(kit.CJK_FONT, 40)
    for k, t in enumerate(['每日簽到', '今日任務', '修為 +120']):
        for j, ch in enumerate(t):
            d.text((130 - k * 60, 30 + j * 46), ch, font=f, fill=(120, 40, 30) if k < 2 else (190, 60, 40))
    return save('scroll', np.asarray(img))


material('quote', rough=0.4, tex=tex_quote(), emit=srgb('#ffffff'), emit_strength=0.6, emit_tex=True)
material('codex_pages', rough=0.8, tex=tex_codex())
material('scroll', rough=0.85, tex=tex_scroll())
# 報價玉碑（右前方）
QX, QY = 1.5, -1.45
box('stele_base', (0.5, 0.3, 0.12), (QX, QY, 0.06), 'violet', bevel=0.02)
label_block('stele', (0.42, 0.1, 0.6), (QX, QY, 0.42), 'quote', bevel=0.02, face='front', rot=(0, 0, 0.3))
cone('stele_cap', 0.36, 0.05, 0.12, (QX, QY, 0.78), 'gold', verts=4, rot=(0, 0, math.pi / 4 + 0.3))
# 神祇圖鑑（左前方，攤開的書）
CBX, CBY = -1.4, -1.45
box('codex_stand', (0.12, 0.12, 0.3), (CBX, CBY, 0.15), 'violet', bevel=0.01)
box('codex_cover', (0.66, 0.44, 0.04), (CBX, CBY, 0.33), 'codex_cover', rot=(0.35, 0, -0.25), bevel=0.01)
label_block('codex_pages', (0.62, 0.4, 0.02), (CBX, CBY, 0.36), 'codex_pages', bevel=0, rot=(0.35, 0, -0.25))
# 修為火盆（後方兩側）＋任務卷軸
for k, (bx, by) in enumerate([(-1.6, 1.25), (1.25, 1.6)]):
    cyl('brazier_leg', 0.05, 0.4, (bx, by, 0.2), 'gold', verts=6)
    cyl('brazier_bowl', 0.2, 0.12, (bx, by, 0.44), 'gold', verts=12)
    cone(f'flame_{k}', 0.15, 0.0, 0.4, (bx, by, 0.68), 'flame' if k == 0 else 'flame_v', verts=8, group=f'Pulse{k + 1}')
SCX, SCY = -1.75, 0.3
kit.beam('scroll_rod_t', (SCX, SCY - 0.14, 1.25), (SCX, SCY + 0.14, 1.25), 0.03, 'gold', round_=True)
label_block('task_scroll', (0.02, 0.26, 0.6), (SCX, SCY, 0.92), 'scroll', bevel=0, rot=(0, 0, -math.pi / 2), face='front')
kit.beam('scroll_rod_b', (SCX, SCY - 0.14, 0.6), (SCX, SCY + 0.14, 0.6), 0.03, 'gold', round_=True)
kit.beam('scroll_pole', (SCX - 0.05, SCY, 0), (SCX - 0.05, SCY, 1.3), 0.025, 'violet')

# ── 合併、樞紐、匯出 ──
kit.merge_group('static', 'altar')
kit.pivot(kit.merge_group('Bob0', 'card'), 'Bob0', (0, -0.05, TOP + 0.42))
for k, (bx, by) in enumerate([(-1.6, 1.25), (1.25, 1.6)]):
    kit.pivot(kit.merge_group(f'Pulse{k + 1}', f'flame{k}'), f'Pulse{k + 1}', (bx, by, 0.5))
kit.pivot(kit.merge_group('Billboard0', 'beast'), 'Billboard0', (0, 0, HZ))
kit.pivot(kit.merge_group('Spin0', 'ringa'), 'Spin0', (0, 0, HZ - 0.55))
kit.pivot(kit.merge_group('SpinR0', 'ringb'), 'SpinR0', (0, 0, HZ - 0.35))
kit.pivot(kit.merge_group('SpinR1', 'ringc'), 'SpinR1', (0, 0, HZ - 0.75))
for i in range(6):
    a = math.radians(210 - i * 48)
    h = 0.35 + i * 0.16
    kit.pivot(kit.merge_group(f'Billboard{1 + i}', f'orb{i}'), f'Billboard{1 + i}', (math.cos(a) * 1.62, math.sin(a) * 1.62, h + 0.26))
codex = []
for i in range(len(OTHERS)):
    a = i * math.tau / len(OTHERS) + 0.4
    codex.append(kit.pivot(kit.merge_group(f'Billboard{7 + i}', f'codex{i}'), f'Billboard{7 + i}', (math.cos(a) * 2.35, math.sin(a) * 2.35, 2.2 + (i % 2) * 0.35)))
orbit = bpy.data.objects.new('Spin1', None)
bpy.context.scene.collection.objects.link(orbit)
for c in codex:
    c.parent = orbit
kit.export(OUT)
