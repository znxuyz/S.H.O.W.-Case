"""
《國小排課系統》施工現場微縮箱庭 —— Blender 程序化建模腳本（背景模式執行）

用法（需要 bpy 5.x）：
    python tools/blender/build_scheduling.py <輸出.glb>

座標：Blender Z 軸朝上；匯出 glTF 時自動轉為 Y 朝上。
地塊 4×4、頂面高度 z=0，與網站 src/three/kit.tsx 的 Plinth 尺寸一致。
Blender 的 -Y 方向 = 網站場景的 +Z（鏡頭正面）。
"""
import math
import os
import random
import sys
import tempfile

import bpy  # 必須先載入 bpy，bmesh / mathutils 才能匯入
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'scheduling.glb'
TEX_DIR = tempfile.mkdtemp(prefix='show_tex_')
rng = random.Random(502)
np_rng = np.random.default_rng(502)

# ───────────────────────── 場景初始化 ─────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
dg = bpy.context.evaluated_depsgraph_get


# ───────────────────────── 程序化貼圖 ─────────────────────────
def noise(size, scale, octaves=4, seed=0):
    g = np.random.default_rng(seed)
    out = np.zeros((size, size))
    amp = 1.0
    for o in range(octaves):
        n = max(2, int(scale * 2 ** o))
        base = g.random((n, n))
        img = Image.fromarray((base * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
        out += np.asarray(img, dtype=np.float32) / 255 * amp
        amp *= 0.5
    out -= out.min()
    return out / out.max()


def save(name, arr):
    path = os.path.join(TEX_DIR, f'{name}.png')
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path)
    return path


def tint(n, c0, c1):
    c0, c1 = np.array(c0, np.float32), np.array(c1, np.float32)
    return c0[None, None, :] * (1 - n[..., None]) + c1[None, None, :] * n[..., None]


def tex_concrete():
    n = noise(512, 4, 5, 1)
    speck = (np_rng.random((512, 512)) > 0.985) * 0.35
    arr = tint(np.clip(n * 0.7 + speck, 0, 1), (150, 150, 146), (198, 196, 190))
    return save('concrete', arr)


def tex_gravel():
    n = noise(512, 8, 4, 2)
    arr = tint(n, (112, 100, 86), (164, 150, 128))
    img = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(img)
    for _ in range(2600):
        x, y, r = rng.randrange(512), rng.randrange(512), rng.choice([1, 1, 2, 2, 3])
        c = rng.choice([(90, 82, 72), (186, 176, 158), (128, 120, 108), (205, 196, 180)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    return save('gravel', np.asarray(img))


def tex_brick():
    W = 512
    img = Image.new('RGB', (W, W), (196, 186, 170))
    d = ImageDraw.Draw(img)
    bh, bw = 32, 76
    for row in range(W // bh + 1):
        off = (bw // 2) * (row % 2)
        for col in range(-1, W // bw + 2):
            x0, y0 = col * bw + off + 3, row * bh + 3
            base = rng.choice([(158, 70, 52), (170, 82, 60), (146, 64, 48), (182, 92, 66), (136, 60, 46)])
            d.rectangle([x0, y0, x0 + bw - 6, y0 + bh - 6], fill=base)
    arr = np.asarray(img, dtype=np.float32) * (0.85 + noise(W, 16, 3, 3)[..., None] * 0.3)
    return save('brick', arr)


def tex_wood():
    W = 512
    y = np.linspace(0, 1, W)[:, None]
    grain = noise(W, 3, 3, 4)
    stripes = (np.sin((y * 90 + grain * 6) * math.pi) * 0.5 + 0.5)
    planks = ((np.arange(W)[:, None] // 64) % 2) * 0.12
    arr = tint(np.clip(stripes * 0.6 + planks + grain * 0.3, 0, 1), (122, 82, 46), (190, 140, 88))
    arr = np.broadcast_to(arr, (W, W, 3)).copy()
    arr[(np.arange(W) % 64) < 2, :, :] *= 0.55
    return save('wood', arr)


def tex_paint_yellow():
    n = noise(256, 6, 4, 5)
    arr = tint(n, (232, 172, 20), (255, 206, 60))
    wear = noise(256, 20, 2, 6) > 0.86
    arr[wear] = arr[wear] * 0.55
    return save('paint_yellow', arr)


def tex_blueprint():
    W = 512
    img = Image.new('RGB', (W, W), (24, 76, 150))
    d = ImageDraw.Draw(img)
    for i in range(0, W, 16):
        d.line([(i, 0), (i, W)], fill=(52, 104, 176), width=1)
        d.line([(0, i), (W, i)], fill=(52, 104, 176), width=1)
    for i in range(0, W, 64):
        d.line([(i, 0), (i, W)], fill=(90, 140, 205), width=1)
        d.line([(0, i), (W, i)], fill=(90, 140, 205), width=1)
    c = (226, 238, 255)
    d.rectangle([80, 200, 430, 420], outline=c, width=3)
    d.rectangle([215, 120, 295, 420], outline=c, width=3)
    d.polygon([(200, 120), (255, 70), (310, 120)], outline=c)
    for r in range(2):
        for k in range(6):
            x = 100 + k * 54 + (40 if k > 2 else 0)
            if x < 410:
                d.rectangle([x, 240 + r * 80, x + 24, 280 + r * 80], outline=c, width=2)
    d.ellipse([235, 140, 275, 180], outline=c, width=2)
    d.line([(80, 450), (430, 450)], fill=c, width=2)
    d.line([(80, 440), (80, 460)], fill=c, width=2)
    d.line([(430, 440), (430, 460)], fill=c, width=2)
    return save('blueprint', np.asarray(img.filter(ImageFilter.SMOOTH)))


def tex_corrugated():
    W = 256
    x = np.linspace(0, 1, W)[None, :]
    ribs = np.sin(x * math.pi * 2 * 14) * 0.5 + 0.5
    n = noise(W, 6, 3, 7)
    v = np.clip(ribs * 0.35 + n * 0.25 + 0.4, 0, 1)
    arr = tint(np.broadcast_to(v, (W, W)), (34, 86, 150), (74, 132, 196))
    return save('corrugated', arr)


def tex_soil():
    return save('soil', tint(noise(512, 6, 5, 8), (92, 66, 44), (132, 96, 64)))


def tex_rock():
    return save('rock', tint(noise(512, 5, 5, 9), (58, 50, 44), (102, 92, 82)))


# ───────────────────────── 材質 ─────────────────────────
MATS = {}


def material(name, color=(0.8, 0.8, 0.8), rough=0.8, metal=0.0, tex=None, emit=None, emit_strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if tex:
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(tex)
        nt.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    MATS[name] = m
    return m


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


material('concrete', rough=0.9, tex=tex_concrete())
material('concrete_dark', srgb('#8f8d86'), rough=0.95)
material('gravel', rough=1.0, tex=tex_gravel())
material('soil', rough=1.0, tex=tex_soil())
material('rock', rough=1.0, tex=tex_rock())
material('brick', rough=0.9, tex=tex_brick())
material('wood', rough=0.75, tex=tex_wood())
material('steel', srgb('#a7b0ba'), rough=0.32, metal=0.85)
material('rebar', srgb('#7a4a30'), rough=0.85, metal=0.4)
material('yellow', rough=0.45, metal=0.15, tex=tex_paint_yellow())
material('black', srgb('#24272c'), rough=0.6)
material('glass', srgb('#a9d4ff'), rough=0.05, alpha=0.45)
material('net', srgb('#3fbf6a'), rough=0.9, alpha=0.5)
material('orange', srgb('#ff6b1f'), rough=0.6)
material('white', srgb('#f2f0ea'), rough=0.6)
material('container', rough=0.55, metal=0.3, tex=tex_corrugated())
material('blueprint', rough=0.85, tex=tex_blueprint())
material('bag', srgb('#d8cbb0'), rough=0.95)
material('lamp', srgb('#ffe2a0'), emit=srgb('#ffd27a'), emit_strength=6)
material('window_warm', srgb('#ffe0a0'), emit=srgb('#ffc870'), emit_strength=3)
material('beacon', srgb('#ff4a2a'), emit=srgb('#ff3a1a'), emit_strength=8)
material('hat', srgb('#ffcf1a'), rough=0.35)

# ───────────────────────── 建模工具 ─────────────────────────
GROUPS = {}  # group -> list of objects
UV_SCALE = 1.4


def finalize(obj, mat, group='static', bevel=0.0, segs=2, uv=True):
    """套用倒角（烘焙成實際幾何）、世界座標方盒投影 UV、指定材質與群組"""
    if bevel > 0:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segs
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
        ev = obj.evaluated_get(dg())
        mesh = bpy.data.meshes.new_from_object(ev)
        obj.modifiers.clear()
        old = obj.data
        obj.data = mesh
        bpy.data.meshes.remove(old)
    if uv:
        box_uv(obj)
    obj.data.materials.clear()
    obj.data.materials.append(MATS[mat])
    GROUPS.setdefault(group, []).append(obj)
    return obj


def box_uv(obj):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    layer = bm.loops.layers.uv.verify()
    mw = obj.matrix_world
    rot = mw.to_3x3()
    for f in bm.faces:
        n = (rot @ f.normal)
        ax = max(range(3), key=lambda i: abs(n[i]))
        for loop in f.loops:
            w = mw @ loop.vert.co
            if ax == 0:
                u, v = w.y, w.z
            elif ax == 1:
                u, v = w.x, w.z
            else:
                u, v = w.x, w.y
            loop[layer].uv = (u * UV_SCALE, v * UV_SCALE)
    bm.to_mesh(me)
    bm.free()


def box(name, size, loc, mat, rot=(0, 0, 0), group='static', bevel=0.012, segs=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finalize(o, mat, group, bevel, segs)


def cyl(name, r, h, loc, mat, rot=(0, 0, 0), verts=12, group='static', bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finalize(o, mat, group, bevel)


def beam(name, a, b, thick, mat, group='static', round_=False):
    """兩點之間的桿件（方管或圓管）"""
    a, b = Vector(a), Vector(b)
    d = b - a
    length = d.length
    mid = (a + b) / 2
    rot = d.to_track_quat('Z', 'Y').to_euler()
    if round_:
        return cyl(name, thick / 2, length, mid, mat, rot=rot, verts=8, group=group)
    return box(name, (thick, thick, length), mid, mat, rot=rot, group=group, bevel=0)


def cone(name, r1, r2, h, loc, mat, verts=16, group='static', rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finalize(o, mat, group)


def ico(name, r, loc, mat, sub=1, scale=(1, 1, 1), group='static'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for v in o.data.vertices:
        v.co *= 0.85 + rng.random() * 0.3
    return finalize(o, mat, group)


# ───────────────────────── 地塊 ─────────────────────────
S = 4.0
box('site_ground', (S - 0.16, S - 0.16, 0.28), (0, 0, -0.14), 'gravel', bevel=0.02)
for i, (sx, sy, x, y) in enumerate([(S, 0.16, 0, S / 2 - 0.08), (S, 0.16, 0, -S / 2 + 0.08), (0.16, S - 0.32, S / 2 - 0.08, 0), (0.16, S - 0.32, -S / 2 + 0.08, 0)]):
    box(f'curb_{i}', (sx, sy, 0.3), (x, y, -0.13), 'concrete', bevel=0.025)
box('soil', (S - 0.06, S - 0.06, 0.48), (0, 0, -0.52), 'soil', bevel=0.03)
box('rock', (S - 0.18, S - 0.18, 0.4), (0, 0, -0.96), 'rock', bevel=0.04)
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=S * 0.65, radius2=0, depth=2, location=(0, 0, -2.15), rotation=(math.pi, 0, math.pi / 4))
o = bpy.context.active_object
for v in o.data.vertices:
    if v.co.z < 0.9:
        v.co.x += (rng.random() - 0.5) * 0.25
        v.co.y += (rng.random() - 0.5) * 0.25
finalize(o, 'rock')
for i, (x, y, z, r) in enumerate([(1.3, -0.7, -1.5, 0.38), (-1.1, 0.8, -1.8, 0.3), (0.4, 1.2, -2.6, 0.2)]):
    ico(f'float_rock_{i}', r, (x, y, z), 'rock')

# ───────────────────────── 施工中的校舍 ─────────────────────────
BX, BY = -0.35, 0.15  # 建物中心
box('pad', (2.7, 2.3, 0.06), (BX, BY, 0.03), 'concrete', bevel=0.01)
box('slab_1', (2.4, 2.0, 0.12), (BX, BY, 0.12), 'concrete', bevel=0.02)
cols = [(BX + dx, BY + dy) for dx in (-1.08, 0, 1.08) for dy in (-0.88, 0.88)]
for i, (x, y) in enumerate(cols):
    box(f'col1_{i}', (0.14, 0.14, 0.8), (x, y, 0.58), 'concrete', bevel=0.012)
box('slab_2', (2.4, 2.0, 0.1), (BX, BY, 1.03), 'concrete', bevel=0.018)
# 二樓：只完成一半的柱子 + 外露鋼筋
for i, (x, y) in enumerate(cols):
    h = 0.75 if i % 2 == 0 else 0.42
    box(f'col2_{i}', (0.14, 0.14, h), (x, y, 1.08 + h / 2), 'concrete', bevel=0.012)
    for k, (ox, oy) in enumerate([(-0.04, -0.04), (0.04, -0.04), (-0.04, 0.04), (0.04, 0.04)]):
        cyl(f'rebar_{i}_{k}', 0.008, 0.28, (x + ox, y + oy, 1.08 + h + 0.12), 'rebar', verts=6)
box('beam_2', (2.36, 0.12, 0.12), (BX, BY + 0.88, 1.79), 'concrete', bevel=0.01)

# 一樓：後牆完整（含兩扇窗）、左牆一磚一磚砌到一半
WALL_Y = BY + 0.95
for i, (x0, x1) in enumerate([(-1.15, -0.62), (-0.18, 0.18), (0.62, 1.15)]):
    box(f'backwall_{i}', (x1 - x0, 0.1, 0.78), (BX + (x0 + x1) / 2, WALL_Y, 0.57), 'brick', bevel=0.006)
for i, xc in enumerate((-0.4, 0.4)):
    box(f'win_sill_{i}', (0.44, 0.1, 0.22), (BX + xc, WALL_Y, 0.29), 'brick', bevel=0.006)
    box(f'win_head_{i}', (0.44, 0.1, 0.16), (BX + xc, WALL_Y, 0.88), 'brick', bevel=0.006)
    box(f'win_frame_{i}', (0.44, 0.12, 0.4), (BX + xc, WALL_Y, 0.6), 'white', bevel=0.004)
    box(f'win_glass_{i}', (0.38, 0.13, 0.34), (BX + xc, WALL_Y, 0.6), 'glass', bevel=0)
    box(f'win_mull_{i}', (0.02, 0.135, 0.34), (BX + xc, WALL_Y, 0.6), 'white', bevel=0)
BRICK_L, BRICK_H = 0.2, 0.065
wx = BX - 1.16
for row in range(11):
    z = 0.18 + row * (BRICK_H + 0.008) + BRICK_H / 2
    built = 2.0 - row * 0.14 + (rng.random() * 0.1)
    off = (BRICK_L / 2) * (row % 2)
    y = BY - 0.85 + off
    while y < BY - 0.85 + built and y < BY + 0.85:
        box('brick', (0.1, BRICK_L - 0.012, BRICK_H), (wx, y + BRICK_L / 2, z), 'brick', bevel=0.004, segs=1)
        y += BRICK_L
# 鷹架（正面）
SY = BY - 1.15
for i, x in enumerate([BX - 1.1, BX - 0.55, BX, BX + 0.55, BX + 1.1]):
    beam(f'scaf_v_{i}', (x, SY, 0.06), (x, SY, 1.95), 0.03, 'steel', round_=True)
    beam(f'scaf_v2_{i}', (x, SY - 0.32, 0.06), (x, SY - 0.32, 1.95), 0.03, 'steel', round_=True)
for lvl, z in enumerate((0.55, 1.05, 1.55)):
    beam(f'scaf_h_{lvl}', (BX - 1.12, SY, z), (BX + 1.12, SY, z), 0.026, 'steel', round_=True)
    beam(f'scaf_h2_{lvl}', (BX - 1.12, SY - 0.32, z), (BX + 1.12, SY - 0.32, z), 0.026, 'steel', round_=True)
    for i in range(4):
        x0 = BX - 1.1 + i * 0.55
        box(f'scaf_plank_{lvl}_{i}', (0.52, 0.3, 0.025), (x0 + 0.275, SY - 0.16, z + 0.02), 'wood', bevel=0.004, segs=1)
        a, b = (x0, SY - 0.32, z - 0.5 if lvl else 0.08), (x0 + 0.55, SY - 0.32, z)
        beam(f'scaf_d_{lvl}_{i}', a, b, 0.02, 'steel', round_=True)
box('safety_net', (1.15, 0.01, 1.3), (BX + 0.55, SY - 0.34, 1.2), 'net', bevel=0)

# ───────────────────────── 塔吊（獨立物件，可旋轉） ─────────────────────────
CX, CY = 1.35, 1.3
MAST_H = 3.15
m = 0.11
for cx_, cy_ in ((-m, -m), (m, -m), (-m, m), (m, m)):
    beam('mast_leg', (CX + cx_, CY + cy_, 0.05), (CX + cx_, CY + cy_, MAST_H), 0.035, 'yellow', group='crane')
z = 0.05
k = 0
while z < MAST_H - 0.2:
    z2 = z + 0.26
    for (a, b) in [((-m, -m), (m, -m)), ((m, -m), (m, m)), ((m, m), (-m, m)), ((-m, m), (-m, -m))]:
        beam('mast_ring', (CX + a[0], CY + a[1], z2), (CX + b[0], CY + b[1], z2), 0.018, 'yellow', group='crane')
        if k % 2:
            beam('mast_diag', (CX + a[0], CY + a[1], z), (CX + b[0], CY + b[1], z2), 0.014, 'yellow', group='crane')
        else:
            beam('mast_diag', (CX + b[0], CY + b[1], z), (CX + a[0], CY + a[1], z2), 0.014, 'yellow', group='crane')
    z = z2
    k += 1
box('crane_base', (0.5, 0.5, 0.12), (CX, CY, 0.06), 'concrete_dark', bevel=0.015)
cyl('turntable', 0.2, 0.1, (CX, CY, MAST_H + 0.05), 'black', group='crane', verts=20)
box('cab', (0.26, 0.24, 0.24), (CX + 0.2, CY - 0.18, MAST_H + 0.02), 'white', group='crane', bevel=0.02)
box('cab_window', (0.27, 0.2, 0.12), (CX + 0.2, CY - 0.2, MAST_H + 0.05), 'window_warm', group='crane', bevel=0)
# 吊臂（三角斷面桁架，朝 -X）
JZ = MAST_H + 0.14
JL = 2.5
top = (0, JZ + 0.2)
for i in range(12):
    x0 = CX - i * JL / 12
    x1 = CX - (i + 1) * JL / 12
    for dy in (-0.07, 0.07):
        beam('jib_chord', (x0, CY + dy, JZ), (x1, CY + dy, JZ), 0.022, 'yellow', group='crane')
        beam('jib_web', (x0, CY + dy, JZ), (x1, CY, JZ + 0.16), 0.012, 'yellow', group='crane')
    beam('jib_top', (x0, CY, JZ + 0.16), (x1, CY, JZ + 0.16), 0.018, 'yellow', group='crane')
    beam('jib_rung', (x0, CY - 0.07, JZ), (x0, CY + 0.07, JZ), 0.012, 'yellow', group='crane')
# 平衡臂與配重
for dy in (-0.08, 0.08):
    beam('cjib', (CX, CY + dy, JZ), (CX + 1.0, CY + dy, JZ), 0.03, 'yellow', group='crane')
for i in range(3):
    box(f'counterweight_{i}', (0.12, 0.26, 0.3), (CX + 0.62 + i * 0.13, CY, JZ - 0.12), 'concrete_dark', group='crane', bevel=0.01)
box('cjib_deck', (1.0, 0.2, 0.02), (CX + 0.5, CY, JZ + 0.01), 'steel', group='crane', bevel=0)
# 塔頂 A 字架與拉索
beam('apex_a', (CX - 0.1, CY, JZ), (CX, CY, JZ + 0.75), 0.04, 'yellow', group='crane')
beam('apex_b', (CX + 0.1, CY, JZ), (CX, CY, JZ + 0.75), 0.04, 'yellow', group='crane')
beam('tie_jib', (CX, CY, JZ + 0.75), (CX - JL * 0.7, CY, JZ + 0.16), 0.008, 'black', group='crane', round_=True)
beam('tie_cjib', (CX, CY, JZ + 0.75), (CX + 0.95, CY, JZ + 0.02), 0.008, 'black', group='crane', round_=True)
cyl('beacon', 0.035, 0.05, (CX, CY, JZ + 0.8), 'beacon', group='crane', verts=10)
# 小車 + 鋼索 + 吊鉤（吊鉤另成物件，網站上會上下晃動）
TX = CX - 1.6
box('trolley', (0.14, 0.18, 0.06), (TX, CY, JZ - 0.03), 'black', group='crane', bevel=0.008)
beam('cable', (TX, CY, JZ - 0.05), (TX, CY, 1.95), 0.008, 'black', group='crane', round_=True)
box('hook_block', (0.1, 0.06, 0.12), (TX, CY, 1.89), 'yellow', group='hook', bevel=0.01)
bpy.ops.mesh.primitive_torus_add(major_radius=0.035, minor_radius=0.01, location=(TX, CY, 1.79), rotation=(math.pi / 2, 0, 0))
finalize(bpy.context.active_object, 'steel', 'hook')
box('load_beam', (0.5, 0.06, 0.06), (TX, CY, 1.67), 'steel', group='hook', bevel=0.006)
beam('sling_a', (TX, CY, 1.78), (TX - 0.22, CY, 1.7), 0.006, 'black', group='hook', round_=True)
beam('sling_b', (TX, CY, 1.78), (TX + 0.22, CY, 1.7), 0.006, 'black', group='hook', round_=True)

# ───────────────────────── 工地道具 ─────────────────────────
# 工務所貨櫃屋
OX, OY = -1.32, -1.25
box('office', (0.9, 0.5, 0.48), (OX, OY, 0.26), 'container', bevel=0.012)
box('office_roof', (0.96, 0.56, 0.04), (OX, OY, 0.52), 'white', bevel=0.008)
box('office_door', (0.16, 0.02, 0.32), (OX + 0.26, OY - 0.255, 0.2), 'white', bevel=0.004)
box('office_win', (0.3, 0.02, 0.16), (OX - 0.15, OY - 0.255, 0.3), 'window_warm', bevel=0.003)
box('office_ac', (0.14, 0.1, 0.1), (OX - 0.3, OY + 0.29, 0.3), 'white', bevel=0.008)
box('office_step', (0.22, 0.12, 0.05), (OX + 0.26, OY - 0.32, 0.025), 'concrete_dark', bevel=0.006)
# 棧板 + 水泥袋
PX, PY = 1.25, -1.25
for i in range(5):
    box(f'pallet_top_{i}', (0.5, 0.08, 0.02), (PX, PY - 0.2 + i * 0.1, 0.09), 'wood', bevel=0.004, segs=1)
for i in range(3):
    box(f'pallet_blk_{i}', (0.08, 0.5, 0.06), (PX - 0.2 + i * 0.2, PY, 0.04), 'wood', bevel=0.004, segs=1)
for layer in range(2):
    for i in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(PX - 0.15 + i * 0.15 + layer * 0.02, PY + (0.1 if layer else -0.08), 0.14 + layer * 0.08))
        o = bpy.context.active_object
        o.scale = (0.14, 0.28, 0.07)
        o.rotation_euler = (0, 0, (rng.random() - 0.5) * 0.15)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        sub = o.modifiers.new('sub', 'SUBSURF')
        sub.levels = 2
        finalize(o, 'bag', bevel=0.02)
# 鋼管堆
for i in range(6):
    row = 0 if i < 4 else 1
    x = 0.95 + (i if row == 0 else i - 4) * 0.07 + row * 0.035
    cyl(f'pipe_{i}', 0.03, 0.9, (x, 0.42, 0.05 + 0.03 + row * 0.055), 'steel', rot=(math.pi / 2, 0, 0), verts=12)
for y in (0.1, 0.74):
    box('pipe_block', (0.36, 0.06, 0.05), (1.05, y, 0.025), 'wood', bevel=0.004, segs=1)
# 三角錐（帶白色反光環）
for i, (x, y) in enumerate([(-0.1, -1.72), (0.35, -1.72), (0.8, -1.72), (1.7, -0.45)]):
    cone(f'cone_{i}', 0.07, 0.012, 0.22, (x, y, 0.13), 'orange')
    cyl(f'cone_band_{i}', 0.047, 0.04, (x, y, 0.14), 'white', verts=16)
    box(f'cone_base_{i}', (0.16, 0.16, 0.02), (x, y, 0.01), 'orange', bevel=0.004)
# 施工圍籬
for i in range(5):
    x = -1.75 + i * 0.36
    beam(f'fence_post_{i}', (x, -1.84, 0), (x, -1.84, 0.42), 0.025, 'steel', round_=True)
    if i < 4:
        box(f'fence_panel_{i}', (0.34, 0.01, 0.34), (x + 0.18, -1.84, 0.22), 'net', bevel=0)
        box(f'fence_rail_{i}', (0.36, 0.02, 0.02), (x + 0.18, -1.84, 0.4), 'steel', bevel=0)
    box(f'fence_foot_{i}', (0.08, 0.16, 0.04), (x, -1.84, 0.02), 'orange', bevel=0.006)
# 藍圖桌 + 安全帽
TX2, TY2 = 0.62, -0.95
box('table_top', (0.5, 0.34, 0.03), (TX2, TY2, 0.36), 'wood', bevel=0.006, segs=1)
box('table_sheet', (0.44, 0.28, 0.006), (TX2, TY2, 0.378), 'blueprint', bevel=0)
for dx in (-0.22, 0.22):
    for dy in (-0.14, 0.14):
        beam('table_leg', (TX2 + dx, TY2 + dy, 0), (TX2 + dx, TY2 + dy, 0.35), 0.022, 'black')
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.07, location=(TX2 + 0.14, TY2 + 0.06, 0.38))
o = bpy.context.active_object
for v in o.data.vertices:
    v.co.z = max(v.co.z, 0)
finalize(o, 'hat')
box('ground_blueprint', (0.9, 0.62, 0.004), (-0.05, -1.0, 0.004), 'blueprint', rot=(0, 0, 0.12), bevel=0)
# 工地照明燈
for i, (x, y) in enumerate([(-1.75, 0.2), (1.78, 0.35)]):
    beam(f'light_pole_{i}', (x, y, 0), (x, y, 1.1), 0.035, 'black', round_=True)
    box(f'light_head_{i}', (0.16, 0.08, 0.1), (x, y, 1.12), 'black', bevel=0.008)
    box(f'light_lens_{i}', (0.13, 0.085, 0.07), (x, y - 0.005, 1.11), 'lamp', bevel=0)
# 碎石堆
for i in range(14):
    a = rng.random() * math.tau
    r = rng.random() * 0.22
    ico(f'gravel_{i}', 0.04 + rng.random() * 0.04, (-1.45 + math.cos(a) * r, 0.95 + math.sin(a) * r, 0.03), 'concrete_dark', sub=0)


# ───────────────────────── 合併與匯出 ─────────────────────────
def join(objs, name):
    if not objs:
        return None
    with bpy.context.temp_override(active_object=objs[0], object=objs[0], selected_objects=objs, selected_editable_objects=objs):
        bpy.ops.object.join()
    o = objs[0]
    o.name = name
    return o


def merge_group(group, name):
    by_mat = {}
    for o in GROUPS.get(group, []):
        by_mat.setdefault(o.data.materials[0].name, []).append(o)
    parts = [join(objs, f'{name}_{mat}') for mat, objs in by_mat.items()]
    return [p for p in parts if p]


def pivot(objs, name, piv):
    """把一組物件放進以 piv 為原點的空物件下（網站以它為旋轉中心）"""
    empty = bpy.data.objects.new(name, None)
    scene.collection.objects.link(empty)
    empty.location = piv
    for o in objs:
        o.parent = empty
        o.matrix_parent_inverse = Matrix.Translation(-Vector(piv))
    return empty


static = merge_group('static', 'site')
crane = merge_group('crane', 'crane')
hook = merge_group('hook', 'hook')
crane_root = pivot(crane, 'Crane', (CX, CY, 0))
hook_root = pivot(hook, 'Hook', (TX, CY, 1.95))
hook_root.parent = crane_root
hook_root.matrix_parent_inverse = Matrix.Translation(-Vector((CX, CY, 0)))

tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print(f'objects={len([o for o in bpy.data.objects if o.type == "MESH"])} faces={tris}')

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_image_format='WEBP',
    export_materials='EXPORT',
    export_lights=False,
    export_cameras=False,
)
print('exported', OUT, os.path.getsize(OUT))
