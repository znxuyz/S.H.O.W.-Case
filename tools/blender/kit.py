"""
S.H.O.W. Case 的 Blender 程序化建模共用工具（給 tools/blender/build_*.py 使用）。
必須先 import bpy，bmesh / mathutils 才能匯入。
"""
import math
import os
import random
import tempfile

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TEX_DIR = tempfile.mkdtemp(prefix='show_tex_')
rng = random.Random(502)
np_rng = np.random.default_rng(502)
CJK_FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    GROUPS.clear()
    TRI_STATS.clear()
    MATS.clear()


scene = lambda: bpy.context.scene
dg = lambda: bpy.context.evaluated_depsgraph_get()

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


def material(name, color=(0.8, 0.8, 0.8), rough=0.8, metal=0.0, tex=None, emit=None, emit_strength=0.0, alpha=1.0, emit_tex=False):
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
        if emit_tex:
            nt.links.new(node.outputs['Color'], bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Strength'].default_value = emit_strength or 2.0
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


def standard_materials():
    """常用材質（每次 reset() 後呼叫）"""
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
TRI_STATS = {}  # 零件名稱 -> 三角面數
UV_SCALE = 1.4


def finalize(obj, mat, group='static', bevel=0.0, segs=1, uv=True):
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
    # 面數統計（依零件名稱前綴累計三角面，匯出時列出最多的幾項，方便控管預算）
    key = obj.name.split('.')[0].rstrip('0123456789_')
    TRI_STATS[key] = TRI_STATS.get(key, 0) + sum(len(p.vertices) - 2 for p in obj.data.polygons)
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


def box(name, size, loc, mat, rot=(0, 0, 0), group='static', bevel=0.012, segs=1):
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
    bpy.context.scene.collection.objects.link(empty)
    empty.location = piv
    for o in objs:
        o.parent = empty
        o.matrix_parent_inverse = Matrix.Translation(-Vector(piv))
    return empty




def export(path):
    # 微縮小道具：依材質合併後放進 Props 節點（首頁輕量版會整組刪掉）
    if GROUPS.get('props'):
        _palettize(GROUPS['props'])
        for o in GROUPS['props']:
            if o.data.users > 1:
                o.data = o.data.copy()   # 合併前轉成單一使用者，避免合併時改到共用的原型網格
        pivot(merge_group('props', 'props'), 'Props', (0, 0, 0))
        GROUPS['props'] = []
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print(f'objects={len([o for o in bpy.data.objects if o.type == "MESH"])} faces={tris}')
    top = sorted(TRI_STATS.items(), key=lambda kv: -kv[1])[:10]
    print('tris-top ' + ' '.join(f'{k}:{v}' for k, v in top))
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_apply=True, export_yup=True,
        export_image_format='WEBP', export_materials='EXPORT', export_lights=False, export_cameras=False,
    )
    print('exported', path, os.path.getsize(path))


# ───────────────────────── 進階零件（各專案共用） ─────────────────────────
def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def label_texture(key, text, bg, fg=(255, 255, 255), size=(256, 200), font_size=92, border=True, radius=18):
    img = Image.new('RGB', size, hexrgb(bg) if isinstance(bg, str) else bg)
    d = ImageDraw.Draw(img)
    w, h = size
    if border:
        d.rounded_rectangle([10, 10, w - 10, h - 10], radius=radius, outline=tuple(min(255, c + 60) for c in img.getpixel((0, 0))), width=5)
    font = ImageFont.truetype(CJK_FONT, font_size)
    lines = text.split('\n')
    heights = [d.textbbox((0, 0), ln, font=font)[3] for ln in lines]
    total = sum(heights) + (len(lines) - 1) * 8
    y = (h - total) / 2 - 4
    for ln, lh in zip(lines, heights):
        bb = d.textbbox((0, 0), ln, font=font)
        d.text(((w - bb[2]) / 2, y), ln, font=font, fill=fg)
        y += lh + 8
    return save(f'label_{key}', np.asarray(img))


def label_block(name, size, loc, mat, group='static', bevel=0.03, rot=(0, 0, 0), face='top'):
    """一面顯示完整貼圖（top＝頂面、front＝朝鏡頭的 -Y 面），其餘面取貼圖邊緣純色"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finalize(o, mat, group, bevel=bevel, segs=1, uv=False)
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    for f in bm.faces:
        hit = f.normal.z > 0.6 if face == 'top' else f.normal.y < -0.6
        for lp in f.loops:
            c = lp.vert.co
            if hit and face == 'top':
                lp[uvl].uv = (float(np.clip((c.x + sx) / (2 * sx), 0, 1)), float(np.clip((c.y + sy) / (2 * sy), 0, 1)))
            elif hit:
                lp[uvl].uv = (float(np.clip((c.x + sx) / (2 * sx), 0, 1)), float(np.clip((c.z + sz) / (2 * sz), 0, 1)))
            else:
                lp[uvl].uv = (0.015, 0.5)
    bm.to_mesh(me)
    bm.free()
    o.rotation_euler = rot
    return o


def image_card(name, path, height, loc, group='static', rot=(0, 0, 0), crop_alpha=True):
    """帶透明度的圖片看板（例如角色插畫），朝向 -Y（網站鏡頭方向）"""
    im = Image.open(path).convert('RGBA')
    if crop_alpha:
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
    w, h = im.size
    tex = os.path.join(TEX_DIR, f'card_{name}.png')
    im.save(tex)
    m = bpy.data.materials.new(f'card_{name}')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = bpy.data.images.load(tex)
    nt.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(node.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = 0.8
    m.surface_render_method = 'DITHERED'
    if hasattr(m, 'blend_method'):
        m.blend_method = 'CLIP'
    MATS[m.name] = m
    width = height * w / h
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = (width, height, 1)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    me = o.data
    uvl = me.uv_layers.active or me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (v.x / width + 0.5, v.z / height + 0.5)
    o.data.materials.append(m)
    o.rotation_euler = rot
    GROUPS.setdefault(group, []).append(o)
    return o


def sphere(name, r, loc, mat, seg=24, rings=14, scale=(1, 1, 1), group='static'):
    seg, rings = min(seg, 20), min(rings, 12)   # 面數預算：小球體不需要更細的分段
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finalize(o, mat, group)


def torus(name, R, r, loc, mat, rot=(0, 0, 0), group='static', major=48, minor=10):
    major, minor = min(major, 64), min(minor, 8)   # 面數預算：圓環分段上限
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=major, minor_segments=minor)
    o = bpy.context.active_object
    o.name = name
    return finalize(o, mat, group)


def capsule(name, length, r, loc, mat, group='static'):
    """沿 X 軸的膠囊體（圓柱 + 兩端半球），平滑著色"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=length, location=loc, rotation=(0, math.pi / 2, 0))
    body = bpy.context.active_object
    parts = [body]
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r, location=(loc[0] + s * length / 2, loc[1], loc[2]))
        parts.append(bpy.context.active_object)
    for p in parts:
        bpy.ops.object.shade_smooth() if False else None
        for poly in p.data.polygons:
            poly.use_smooth = True
    with bpy.context.temp_override(active_object=body, object=body, selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    body.name = name
    return finalize(body, mat, group)


NATURAL_TOPS = {'lawn', 'moss', 'forest_floor', 'grass'}


def plinth(top_mat, soil_mat='soil', rock_mat='rock', rim_mat='concrete', size=4.0, float_=True, rich=True):
    """與網站 Plinth 一致的 4×4 地塊（頂面 z=0），附倒錐浮島岩底。
    rich：低面數結構配件——分段壓頂石、四角柱墩、土層岩線、草叢（草地類頂面）、垂吊岩錐與碎石"""
    box('ground', (size - 0.16, size - 0.16, 0.28), (0, 0, -0.14), top_mat, bevel=0.02)
    for (sx, sy, x, y) in [(size, 0.16, 0, size / 2 - 0.08), (size, 0.16, 0, -size / 2 + 0.08), (0.16, size - 0.32, size / 2 - 0.08, 0), (0.16, size - 0.32, -size / 2 + 0.08, 0)]:
        box('rim', (sx, sy, 0.3), (x, y, -0.13) if not rich else (x, y, -0.15), rim_mat, bevel=0.025)
    box('soil', (size - 0.06, size - 0.06, 0.48), (0, 0, -0.52), soil_mat, bevel=0.03)
    box('rockl', (size - 0.18, size - 0.18, 0.4), (0, 0, -0.96), rock_mat, bevel=0.04)
    if rich:
        h = size / 2
        # 分段壓頂石：每邊 6 塊、留細縫，邊緣有倒角能接住高光（比一整條長方塊更有手作感）
        n = 6
        seg = (size - 0.44) / n
        for side in range(4):
            for k in range(n):
                t = -h + 0.22 + seg * (k + 0.5)
                x, y = [(t, h - 0.08), (t, -h + 0.08), (h - 0.08, t), (-h + 0.08, t)][side]
                L = seg - 0.035
                box('capstone', (L, 0.19, 0.05) if side < 2 else (0.19, L, 0.05), (x, y, 0.025), rim_mat, bevel=0.012)
        # 四角柱墩＋尖頂
        for sx in (-1, 1):
            for sy in (-1, 1):
                box('corner_post', (0.24, 0.24, 0.16), (sx * (h - 0.12), sy * (h - 0.12), 0.06), rim_mat, bevel=0.015)
                cone('corner_cap', 0.17, 0.0, 0.08, (sx * (h - 0.12), sy * (h - 0.12), 0.18), rim_mat, verts=4, rot=(0, 0, math.pi / 4))
        # 裸露岩層切面：每邊三層不規則凸出的岩板（深淺交錯、厚薄不一），側面像真實的地層剖面
        natural = rock_mat == 'rock'
        for side in range(4):
            for li, (z0, mat) in enumerate([(-0.36, soil_mat), (-0.6, rock_mat), (-0.86, rock_mat)]):
                t = -h + 0.05
                while t < h - 0.12:
                    L = min(h - 0.05 - t, 0.32 + rng.random() * 0.5)
                    out = 0.02 + rng.random() * (0.05 if natural else 0.02)
                    th = 0.06 + rng.random() * 0.07
                    c = t + L / 2
                    zz = z0 + (rng.random() - 0.5) * 0.06
                    d = h + out / 2 - 0.01
                    x, y, sz = [(c, d, (L, out + 0.02, th)), (c, -d, (L, out + 0.02, th)), (d, c, (out + 0.02, L, th)), (-d, c, (out + 0.02, L, th))][side]
                    box('strata', sz, (x, y, zz), mat, bevel=0)
                    t += L + 0.02 + rng.random() * 0.06
        if natural:
            # 不規則懸崖稜角：從土層側面突出的岩塊
            for k in range(10):
                side = k % 4
                tt = -h + 0.3 + rng.random() * (size - 0.6)
                d = h + 0.02
                x, y = [(tt, d), (tt, -d), (d, tt), (-d, tt)][side]
                ico('cliff_chunk', 0.09 + rng.random() * 0.08, (x, y, -0.45 - rng.random() * 0.45), rock_mat, sub=0, scale=(1.2, 1.2, 0.8))
            # 嵌入式石階：從右前方的崖邊切進土層、往下走的小階梯
            for k in range(4):
                box('cut_step', (0.34, 0.16, 0.06), (1.35, -h - 0.06 - k * 0.07, -0.08 - k * 0.12), rim_mat, bevel=0.01)
        # 草地類頂面：沿邊緣內側散佈小草叢
        if top_mat in NATURAL_TOPS:
            for i in range(22):
                side = i % 4
                t = -h + 0.45 + rng.random() * (size - 0.9)
                d = h - 0.3 - rng.random() * 0.12
                x, y = [(t, d), (t, -d), (d, t), (-d, t)][side]
                cone('tuft', 0.035, 0.0, 0.09 + rng.random() * 0.05, (x, y, 0.04), 'leaf_dark' if i % 2 else 'leaf', verts=3, rot=(0, 0, rng.random() * 3))
    if float_:
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=size * 0.65, radius2=0, depth=2, location=(0, 0, -2.15), rotation=(math.pi, 0, math.pi / 4))
        o = bpy.context.active_object
        for v in o.data.vertices:
            if v.co.z < 0.9:
                v.co.x += (rng.random() - 0.5) * 0.25
                v.co.y += (rng.random() - 0.5) * 0.25
        finalize(o, rock_mat)
        for (x, y, z, r) in [(1.3, -0.7, -1.5, 0.38), (-1.1, 0.8, -1.8, 0.3), (0.4, 1.2, -2.6, 0.2)]:
            ico('float_rock', r, (x, y, z), rock_mat)
        if rich:
            # 垂吊岩錐與小碎石：浮島底部更有重量感
            for k in range(6):
                a = k / 6 * math.tau + 0.3
                r = 1.3 + (k % 2) * 0.35
                cone('stalactite', 0.13 + (k % 3) * 0.04, 0.0, 0.45 + (k % 3) * 0.2, (math.cos(a) * r, math.sin(a) * r, -1.35 - (k % 3) * 0.1), rock_mat, verts=4, rot=(math.pi, 0, a))
            for (x, y, z, r) in [(-1.6, -1.2, -2.2, 0.12), (1.7, 1.0, -2.0, 0.1), (0.2, -1.8, -3.0, 0.09)]:
                ico('pebble', r, (x, y, z), rock_mat, sub=0)


def tree(loc, s=1.0, kind='round', leaf='leaf', leaf2='leaf_dark', trunk='bark', group='static', detail=2):
    """detail：樹冠細分等級（遠景用 0–1 以節省面數）"""
    x, y, z = loc
    cyl('trunk', 0.06 * s, 0.6 * s, (x, y, z + 0.3 * s), trunk, verts=8 if detail > 1 else 5, group=group)
    if kind == 'round' and detail >= 1:
        # 蓬鬆樹冠：7 顆大小不一的低面數多面體錯落堆疊，由下而上深→淺三層色；彎曲的兩段樹幹、樹根與根部草叢
        light = 'leaf_light' if leaf == 'leaf' and 'leaf_light' in MATS else leaf
        cone('root_flare', 0.12 * s, 0.05 * s, 0.1 * s, (x, y, z + 0.05 * s), trunk, verts=6, group=group)
        bend = (rng.random() - 0.5) * 0.16
        beam('trunk_bend', (x, y, z + 0.45 * s), (x + bend * s, y + bend * 0.5 * s, z + 0.75 * s), 0.07 * s, trunk, group=group)
        for (bx, by, bz) in [(0.16, 0.04, 0.8), (-0.14, -0.06, 0.76)]:
            beam('branch', (x, y, z + 0.5 * s), (x + bx * s, y + by * s, z + bz * s), 0.035 * s, trunk, group=group)
        cx, cy = x + bend * s, y + bend * 0.5 * s
        for k, (dx, dy, dz, r, m, sq) in enumerate([(0, 0, 0.8, 0.34, leaf2, 0.65), (-0.2, 0.08, 0.86, 0.2, leaf2, 0.8), (0.21, -0.06, 0.9, 0.19, leaf, 0.8),
                                                    (0.05, 0.18, 0.94, 0.17, leaf, 0.85), (0.02, 0.0, 1.03, 0.27, leaf, 0.72),
                                                    (-0.08, -0.08, 1.2, 0.17, light, 0.85), (0.1, 0.06, 1.25, 0.12, light, 0.9)]):
            j = 0.03 * (rng.random() - 0.5)
            ico('crown', r * s, (cx + (dx + j) * s, cy + (dy - j) * s, z + dz * s), m, sub=1 if (r >= 0.15 or detail > 1) else 0, scale=(1, 1, sq), group=group)
        if detail > 1:
            for k in range(3):
                a = k * 2.1 + rng.random()
                cone('tree_tuft', 0.03 * s, 0.0, 0.1 * s, (x + math.cos(a) * 0.12 * s, y + math.sin(a) * 0.12 * s, z + 0.04 * s), 'leaf_dark' if k % 2 else 'leaf', verts=3, group=group)
    elif kind == 'round':
        cone('root_flare', 0.12 * s, 0.05 * s, 0.1 * s, (x, y, z + 0.05 * s), trunk, verts=6, group=group)
        for (dx, dy, dz, r, m, sq) in [(0, 0, 0.78, 0.36, leaf2, 0.62), (0.02, 0.02, 1.0, 0.28, leaf, 0.7), (0, 0, 1.2, 0.18, leaf, 0.85)]:
            ico('crown', r * s, (x + dx * s, y + dy * s, z + dz * s), m, sub=0, scale=(1, 1, sq), group=group)
    else:
        for i, (r, h, dz) in enumerate([(0.38, 0.5, 0.55), (0.3, 0.45, 0.85), (0.21, 0.4, 1.12), (0.12, 0.34, 1.35)]):
            cone('pine', r * s, 0.0, h * s, (x, y, z + dz * s), leaf2 if i % 2 == 0 else leaf, verts=9, group=group)


def nature_materials():
    material('leaf', srgb('#4fbf73'), rough=0.85)
    material('leaf_dark', srgb('#2f8f5b'), rough=0.9)
    material('leaf_light', srgb('#8fd66f'), rough=0.8)
    material('bark', srgb('#6b4423'), rough=0.95)
    material('grass', rough=1.0, tex=save('grass', tint(noise(512, 8, 5, 21), (86, 150, 70), (130, 190, 96))))


# ───────────────────────── 細節零件（3.0b） ─────────────────────────
def window_frame(loc, w, h, face='-y', frame='white', glass='glass', sill='concrete', group='static', mullions=1):
    """外牆窗：窗框 + 玻璃 + 窗櫺 + 窗台。face 為窗戶朝向（'-y' 朝鏡頭、'+x' 朝右）"""
    x, y, z = loc
    rot = (0, 0, 0) if face in ('-y', '+y') else (0, 0, math.pi / 2)
    s = -1 if face in ('-y', '-x') else 1
    off = (0, s * 0.012, 0) if face in ('-y', '+y') else (s * 0.012, 0, 0)
    box('win_frame', (w + 0.05, 0.03, h + 0.05), (x, y, z), frame, rot=rot, group=group, bevel=0.004)
    box('win_glass', (w, 0.035, h), (x + off[0] * 0.5, y + off[1] * 0.5, z), glass, rot=rot, group=group, bevel=0)
    for m in range(1, mullions + 1):
        u = -w / 2 + w * m / (mullions + 1)
        dx, dy = (u, 0) if face in ('-y', '+y') else (0, u)
        box('win_mull', (0.018, 0.04, h), (x + dx + off[0], y + dy + off[1], z), frame, rot=rot, group=group, bevel=0)
    box('win_bar', (w, 0.04, 0.018), (x + off[0], y + off[1], z), frame, rot=rot, group=group, bevel=0)
    box('win_sill', (w + 0.1, 0.07, 0.03), (x + off[0] * 3, y + off[1] * 3, z - h / 2 - 0.03), sill, rot=rot, group=group, bevel=0.004)


def roof_tiles(x0, x1, y_eave, y_ridge, z_eave, z_ridge, mat, group='static', rows=None, side=1):
    """沿斜屋面排列的瓦壟（半圓管），x0..x1 為屋面寬"""
    n = rows or max(3, int(abs(x1 - x0) / 0.11))
    a = Vector((0, y_eave, z_eave))
    b = Vector((0, y_ridge, z_ridge))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        beam('tile_row', (x, a.y, a.z + 0.02), (x, b.y, b.z + 0.02), 0.045, mat, group=group, round_=True)


def flowerbed(loc, length, axis='x', group='static', colors=('flower_r', 'flower_y', 'flower_w', 'flower_p')):
    x, y, z = loc
    sx, sy = (length, 0.22) if axis == 'x' else (0.22, length)
    box('bed_edge', (sx + 0.04, sy + 0.04, 0.08), (x, y, z + 0.04), 'concrete', group=group, bevel=0.01)
    box('bed_soil', (sx, sy, 0.06), (x, y, z + 0.06), 'soil', group=group, bevel=0)
    n = int(length / 0.09)
    for i in range(n):
        u = -length / 2 + (i + 0.5) * length / n
        px, py = (x + u, y + (rng.random() - 0.5) * 0.1) if axis == 'x' else (x + (rng.random() - 0.5) * 0.1, y + u)
        ico('bush_s', 0.05, (px, py, z + 0.12), 'leaf', sub=1, group=group)
        if i % 2 == 0:
            ico('flower', 0.028, (px, py, z + 0.18), colors[i // 2 % len(colors)], sub=1, group=group)


def hedge(loc, length, axis='x', group='static'):
    x, y, z = loc
    n = max(2, int(length / 0.22))
    for i in range(n):
        u = -length / 2 + (i + 0.5) * length / n
        px, py = (x + u, y) if axis == 'x' else (x, y + u)
        ico('hedge', 0.15, (px, py, z + 0.14), 'leaf_dark' if i % 2 else 'leaf', sub=1, scale=(1.1, 1.0, 0.9), group=group)


def lamp_post(loc, group='static', glow='lamp'):
    x, y, z = loc
    cyl('lamp_pole', 0.022, 0.75, (x, y, z + 0.375), 'black', verts=8, group=group)
    cyl('lamp_base', 0.05, 0.05, (x, y, z + 0.025), 'black', verts=8, group=group)
    box('lamp_head', (0.1, 0.1, 0.05), (x, y, z + 0.78), 'black', group=group, bevel=0.01)
    sphere('lamp_bulb', 0.04, (x, y, z + 0.74), glow, seg=10, rings=6, group=group)


def bike(loc, rot=0.0, color='flower_r', group='static'):
    x, y, z = loc
    for s in (-1, 1):
        dx, dy = math.cos(rot) * s * 0.12, math.sin(rot) * s * 0.12
        torus('wheel', 0.07, 0.008, (x + dx, y + dy, z + 0.075), 'black', rot=(math.pi / 2, 0, rot), group=group, major=16, minor=4)
    beam('frame_a', (x - math.cos(rot) * 0.12, y - math.sin(rot) * 0.12, z + 0.075), (x, y, z + 0.16), 0.012, color, group=group)
    beam('frame_b', (x + math.cos(rot) * 0.12, y + math.sin(rot) * 0.12, z + 0.075), (x, y, z + 0.16), 0.012, color, group=group)
    box('seat', (0.06, 0.03, 0.015), (x - math.cos(rot) * 0.03, y - math.sin(rot) * 0.03, z + 0.18), 'black', rot=(0, 0, rot), group=group, bevel=0)


def detail_materials():
    material('flower_r', srgb('#ff6b6b'), rough=0.7)
    material('flower_p', srgb('#ff9ec4'), rough=0.7)
    material('flower_w', srgb('#ffffff'), rough=0.7)
    if 'flower_y' not in MATS:
        material('flower_y', srgb('#ffd35a'), rough=0.7)


# ───────────────────────── 點擊動畫用的節點（網站以 Fx_<名稱> 尋找） ─────────────────────────
def _center(o):
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return sum(cs, Vector()) / 8, max((max(c[i] for c in cs) - min(c[i] for c in cs)) for i in range(3))


def fx_extract(name, lo, hi, src='static', max_size=1.4, exclude=()):
    """把 src 群組中「包圍盒中心落在 lo..hi 方盒內」的零件搬到 name 群組（太大的地塊類零件跳過）"""
    keep, moved = [], []
    for o in GROUPS.get(src, []):
        c, size = _center(o)
        inside = all(lo[i] <= c[i] <= hi[i] for i in range(3)) and size <= max_size and not o.name.startswith(tuple(exclude))
        (moved if inside else keep).append(o)
    GROUPS[src] = keep
    GROUPS.setdefault(name, []).extend(moved)
    return moved


def fx_node(name, piv):
    """把 name 群組合併並放到樞紐下；群組為空時仍建立空節點（網站端找得到即可）"""
    objs = GROUPS.get(name, [])
    print(f'fx {name}: {len(objs)} parts', sorted({o.name.split('.')[0] for o in objs})[:8])
    return pivot(merge_group(name, name.lower()), name, piv)


def fx_around(name, x, y, r=0.3, z0=0.0, z1=2.0, src='static', piv=None, max_size=1.2, exclude=('rail', 'ballast', 'sleeper', 'root', 'stock')):
    fx_extract(name, (x - r, y - r, z0), (x + r, y + r, z1), src=src, max_size=max_size, exclude=exclude)
    return fx_node(name, piv or (x, y, z0))


def reparent(child, parent):
    """把節點掛到另一個節點底下（保持世界座標不變），例如把封面樞紐掛進會面向鏡頭的看板節點"""
    bpy.context.view_layer.update()   # 新建的空物件要更新後 matrix_world 才正確
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


# ───────────────────────── 微縮生活感小道具（共用 Mesh Data 的 Linked Duplicates） ─────────────────────────
# 每種零件只建立一份網格（PROTO 快取），之後的複本都是指向同一份 Mesh Data 的物件；
# 匯出前 merge_group 依材質合併（WebGL 上合併比多個實例更省繪製呼叫），Draco 再壓縮重複的頂點資料。
PROTO = {}


def ensure(name, color, rough=0.8, metal=0.0, emit=None, emit_strength=0.0):
    """道具用材質：專案已有同名材質就沿用（不額外增加材質種類）"""
    if name not in MATS:
        material(name, srgb(color), rough=rough, metal=metal, emit=srgb(emit) if emit else None, emit_strength=emit_strength)
    return name


def prop_materials():
    ensure('wood', '#9a6b43', 0.75)
    ensure('black', '#24272c', 0.6)
    ensure('steel', '#a7b0ba', 0.32, 0.85)
    ensure('white', '#f2f0ea', 0.6)
    ensure('brick', '#b5653d', 0.9)
    ensure('concrete', '#bdbab2', 0.9)
    ensure('rock', '#8a8478', 1.0)
    ensure('leaf', '#4fbf73', 0.85)
    ensure('leaf_dark', '#2f8f5b', 0.9)
    ensure('lamp', '#ffe2a0', 0.5, emit='#ffd27a', emit_strength=6)
    ensure('flower_r', '#ff6b6b', 0.7)
    ensure('flower_y', '#ffd35a', 0.7)
    ensure('flower_p', '#ff9ec4', 0.7)


def _proto(key, make):
    """make() 在原點建立一個零件並回傳物件；取出它的網格當原型，物件本身刪掉"""
    if key not in PROTO:
        tmp = make()
        if tmp in GROUPS.get('static', []):
            GROUPS['static'].remove(tmp)
        me = tmp.data
        me.transform(tmp.matrix_world)   # 把零件在道具內的位置烘進網格，複本只需整組平移旋轉
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        bpy.data.objects.remove(tmp)
        PROTO[key] = (me, tris)
    return PROTO[key]


def inst(key, make, loc, rot=0.0, scale=1.0, group='static'):
    """放一個共用網格的複本（Linked Duplicate）"""
    me, tris = _proto(key, make)
    o = bpy.data.objects.new(key, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (0, 0, rot)
    o.scale = (scale, scale, scale)
    GROUPS.setdefault(group, []).append(o)
    k = 'prop_' + key.split(':')[0]
    TRI_STATS[k] = TRI_STATS.get(k, 0) + tris
    return o


def _b(size, z, mat, x=0.0, y=0.0, bevel=0.0, rot=(0, 0, 0)):
    return lambda: box('p', size, (x, y, z), mat, bevel=bevel, rot=rot)


def _c(r, h, z, mat, verts=8, x=0.0, y=0.0, rot=(0, 0, 0)):
    return lambda: cyl('p', r, h, (x, y, z), mat, verts=verts, rot=rot)


# 每個道具＝數個（原型鍵, 建立函式）零件，在原點建好，放置時整組平移旋轉
def _parts_bench():
    return [('bench_seat', _b((0.34, 0.1, 0.022), 0.1, 'wood', bevel=0.004)), ('bench_back', _b((0.34, 0.018, 0.08), 0.16, 'wood', y=0.05, bevel=0.003)),
            ('bench_leg', _b((0.02, 0.1, 0.1), 0.05, 'black', x=-0.14)), ('bench_leg', _b((0.02, 0.1, 0.1), 0.05, 'black', x=0.14))]


def _parts_lamp():
    return [('lamp_pole', _c(0.014, 0.5, 0.25, 'black', 6)), ('lamp_base', _c(0.035, 0.03, 0.015, 'black', 8)),
            ('lamp_head', _b((0.06, 0.06, 0.03), 0.52, 'black', bevel=0.006)), ('lamp_bulb', lambda: ico('p', 0.026, (0, 0, 0.49), 'lamp', sub=1))]


def _parts_sign():
    return [('sign_post', _c(0.012, 0.3, 0.15, 'wood', 6)), ('sign_board', _b((0.2, 0.02, 0.12), 0.27, 'white', bevel=0.004)),
            ('sign_frame', _b((0.22, 0.016, 0.14), 0.27, 'wood', y=0.006))]


def _parts_plant():
    return [('pot', lambda: cone('p', 0.05, 0.065, 0.09, (0, 0, 0.045), 'brick', verts=8)),
            ('pot_bush', lambda: ico('p', 0.08, (0, 0, 0.14), 'leaf', sub=1, scale=(1, 1, 0.9))),
            ('pot_bush2', lambda: ico('p', 0.05, (0.03, 0.02, 0.2), 'leaf_dark', sub=0))]


def _parts_books():
    return [('book_a', _b((0.16, 0.11, 0.025), 0.0125, 'flower_r', bevel=0.003)), ('book_b', _b((0.15, 0.1, 0.022), 0.036, 'white', x=0.006, bevel=0.003, rot=(0, 0, 0.12))),
            ('book_c', _b((0.14, 0.1, 0.024), 0.059, 'flower_y', x=-0.004, bevel=0.003, rot=(0, 0, -0.08)))]


def _parts_bikerack():
    parts = [('rack_rail', _b((0.32, 0.018, 0.018), 0.012, 'steel'))]
    for i, x in enumerate((-0.11, 0.0, 0.11)):
        parts.append((f'rack_loop', lambda x=x: torus('p', 0.06, 0.008, (x, 0, 0.06), 'steel', rot=(math.pi / 2, 0, 0), major=10, minor=4)))
    return parts


def _parts_crate():
    return [('crate', _b((0.14, 0.14, 0.12), 0.06, 'wood', bevel=0.008)), ('crate_band', _b((0.145, 0.145, 0.016), 0.06, 'black'))]


def _parts_folders():
    return [('folder_a', _b((0.12, 0.03, 0.16), 0.08, 'flower_r', bevel=0.003)), ('folder_b', _b((0.12, 0.03, 0.15), 0.075, 'flower_y', y=0.035, bevel=0.003)),
            ('folder_c', _b((0.12, 0.03, 0.17), 0.085, 'steel', y=0.07, bevel=0.003))]


def _parts_tuft():
    return [('tuft_a', lambda: cone('p', 0.03, 0.0, 0.1, (0, 0, 0.05), 'leaf', verts=3)), ('tuft_b', lambda: cone('p', 0.025, 0.0, 0.08, (0.035, 0.02, 0.04), 'leaf_dark', verts=3)),
            ('tuft_c', lambda: cone('p', 0.025, 0.0, 0.07, (-0.03, 0.025, 0.035), 'leaf', verts=3))]


def _parts_stone_lantern():
    return [('sl_base', _b((0.1, 0.1, 0.03), 0.015, 'concrete', bevel=0.006)), ('sl_post', _c(0.022, 0.12, 0.09, 'concrete', 6)),
            ('sl_box', _b((0.08, 0.08, 0.06), 0.18, 'lamp', bevel=0.004)), ('sl_frame', _b((0.09, 0.09, 0.012), 0.215, 'concrete')),
            ('sl_roof', lambda: cone('p', 0.08, 0.0, 0.06, (0, 0, 0.25), 'concrete', verts=4, rot=(0, 0, math.pi / 4)))]


def _parts_lantern_string():
    parts = [('ls_post', _c(0.01, 0.42, 0.21, 'wood', 5, x=-0.2)), ('ls_post', _c(0.01, 0.42, 0.21, 'wood', 5, x=0.2)),
             ('ls_rope', _b((0.4, 0.006, 0.006), 0.4, 'black'))]
    for i, x in enumerate((-0.12, 0.0, 0.12)):
        parts.append(('ls_lantern', lambda x=x: sphere('p', 0.03, (x, 0, 0.36), 'lantern_red', seg=8, rings=5, scale=(1, 1, 1.25))))
    return parts


def _parts_trough():
    return [('tr_basin', _b((0.26, 0.12, 0.06), 0.03, 'concrete', bevel=0.008)), ('tr_water', _b((0.22, 0.08, 0.005), 0.058, 'water_prop')),
            ('tr_spout', _b((0.03, 0.03, 0.14), 0.07, 'wood', x=0.14))]


def _parts_rune_pillar():
    return [('rp_base', _b((0.1, 0.1, 0.03), 0.015, 'rock', bevel=0.006)), ('rp_shaft', _c(0.035, 0.3, 0.18, 'rock', 6)),
            ('rp_band', _c(0.038, 0.03, 0.22, 'rune', 6)), ('rp_cap', lambda: cone('p', 0.05, 0.0, 0.06, (0, 0, 0.36), 'rock', verts=6))]


def _parts_floating_rocks():
    return [('fr_a', lambda: ico('p', 0.04, (0, 0, 0.28), 'rock', sub=0)), ('fr_b', lambda: ico('p', 0.028, (0.07, 0.03, 0.36), 'rock', sub=0)),
            ('fr_c', lambda: ico('p', 0.022, (-0.05, -0.02, 0.42), 'rock', sub=0)), ('fr_glow', lambda: ico('p', 0.012, (0.0, 0.0, 0.33), 'rune', sub=0))]


def _parts_mushrooms():
    return [('mu_stem', _c(0.012, 0.05, 0.025, 'white', 5)), ('mu_cap', lambda: cone('p', 0.035, 0.0, 0.03, (0, 0, 0.06), 'flower_r', verts=6)),
            ('mu_stem', _c(0.012, 0.05, 0.025, 'white', 5, x=0.05, y=0.02)), ('mu_cap2', lambda: cone('p', 0.028, 0.0, 0.025, (0.05, 0.02, 0.055), 'flower_y', verts=6))]


def _parts_log():
    return [('log', _c(0.04, 0.22, 0.04, 'bark_prop', 7, rot=(0, math.pi / 2, 0))), ('log_end', _c(0.034, 0.226, 0.04, 'wood', 7, rot=(0, math.pi / 2, 0)))]


def _parts_pipes():
    return [('pp_pipe', _c(0.018, 0.4, 0.05, 'steel', 6, rot=(0, math.pi / 2, 0))), ('pp_pipe2', _c(0.012, 0.4, 0.09, 'steel', 6, y=0.04, rot=(0, math.pi / 2, 0))),
            ('pp_joint', _c(0.026, 0.03, 0.05, 'black', 6, x=-0.1, rot=(0, math.pi / 2, 0))), ('pp_joint', _c(0.026, 0.03, 0.05, 'black', 6, x=0.12, rot=(0, math.pi / 2, 0))),
            ('pp_stand', _b((0.02, 0.06, 0.04), 0.02, 'black', x=-0.15)), ('pp_stand', _b((0.02, 0.06, 0.04), 0.02, 'black', x=0.15)),
            ('pp_glow', _c(0.008, 0.36, 0.115, 'holo', 4, y=-0.025, rot=(0, math.pi / 2, 0)))]


def _parts_antenna():
    return [('an_base', _b((0.08, 0.08, 0.04), 0.02, 'black', bevel=0.006)), ('an_mast', _c(0.008, 0.36, 0.2, 'steel', 5)),
            ('an_dish', lambda: cone('p', 0.07, 0.01, 0.03, (0.03, 0, 0.3), 'white', verts=10, rot=(0, -0.9, 0))),
            ('an_rod', _b((0.12, 0.006, 0.006), 0.36, 'steel')), ('an_rod', _b((0.08, 0.006, 0.006), 0.32, 'steel')), ('an_tip', lambda: ico('p', 0.012, (0, 0, 0.385), 'beacon_prop', sub=0))]


def _parts_holo():
    return [('hb_disc', _c(0.09, 0.03, 0.015, 'black', 12)), ('hb_ring', lambda: torus('p', 0.075, 0.006, (0, 0, 0.034), 'holo', major=16, minor=3)),
            ('hb_core', lambda: ico('p', 0.03, (0, 0, 0.13), 'holo', sub=1, scale=(1, 1, 1.6)))]


def _parts_vent():
    parts = [('vt_box', _b((0.18, 0.12, 0.1), 0.05, 'steel', bevel=0.006))]
    for k in range(4):
        parts.append(('vt_slat', lambda k=k: box('p', (0.16, 0.012, 0.012), (0, -0.064, 0.025 + k * 0.022), 'black', bevel=0)))
    parts.append(('vt_fan', _c(0.04, 0.012, 0.106, 'black', 10)))
    return parts


PROPS = {
    'bench': _parts_bench, 'lamp': _parts_lamp, 'sign': _parts_sign, 'plant': _parts_plant, 'books': _parts_books, 'bikerack': _parts_bikerack,
    'crate': _parts_crate, 'folders': _parts_folders, 'tuft': _parts_tuft, 'stone_lantern': _parts_stone_lantern, 'lantern_string': _parts_lantern_string,
    'trough': _parts_trough, 'rune_pillar': _parts_rune_pillar, 'floating_rocks': _parts_floating_rocks, 'mushrooms': _parts_mushrooms, 'log': _parts_log,
    'pipes': _parts_pipes, 'antenna': _parts_antenna, 'holo': _parts_holo, 'vent': _parts_vent,
}
# 各道具佔地（半寬 x、半深 y）
FOOT = {'bench': (0.19, 0.08), 'lamp': (0.05, 0.05), 'sign': (0.12, 0.04), 'plant': (0.08, 0.08), 'books': (0.1, 0.08), 'bikerack': (0.18, 0.08),
        'crate': (0.09, 0.09), 'folders': (0.08, 0.07), 'tuft': (0.06, 0.06), 'stone_lantern': (0.06, 0.06), 'lantern_string': (0.22, 0.04),
        'trough': (0.17, 0.07), 'rune_pillar': (0.06, 0.06), 'floating_rocks': (0.07, 0.05), 'mushrooms': (0.07, 0.05), 'log': (0.13, 0.05),
        'pipes': (0.2, 0.06), 'antenna': (0.06, 0.06), 'holo': (0.1, 0.1), 'vent': (0.1, 0.08)}
# 主題 → 道具組合（重複＝出現機率較高）
STYLES = {
    'campus': ['bench', 'lamp', 'sign', 'plant', 'plant', 'books', 'bikerack', 'tuft', 'tuft', 'folders', 'crate'],
    'desk': ['books', 'folders', 'plant', 'books', 'crate', 'folders'],
    'oriental': ['stone_lantern', 'stone_lantern', 'lantern_string', 'trough', 'rune_pillar', 'floating_rocks', 'tuft', 'tuft', 'plant'],
    'mythic': ['rune_pillar', 'rune_pillar', 'floating_rocks', 'floating_rocks', 'stone_lantern', 'lantern_string', 'tuft'],
    'forest': ['mushrooms', 'mushrooms', 'log', 'tuft', 'tuft', 'tuft', 'stone_lantern', 'floating_rocks', 'plant'],
    'tech': ['pipes', 'antenna', 'holo', 'vent', 'vent', 'crate', 'pipes', 'holo'],
}
PLINTH_PARTS = ('ground', 'rim', 'soil', 'rockl', 'capstone', 'corner_post', 'corner_cap', 'strata', 'tuft', 'cliff_chunk', 'cut_step', 'stalactite', 'pebble', 'float_rock', 'Cone')


def _occupied(margin=0.05):
    """地表上已被佔用的範圍（世界座標 XY 方盒）：所有零件、包含點擊動畫節點與隱藏的零件"""
    bpy.context.view_layer.update()
    boxes = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.name.split('.')[0].startswith(PLINTH_PARTS):
            continue
        cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
        z0, z1 = min(c.z for c in cs), max(c.z for c in cs)
        # 很薄的地面鋪面（步道、標線、草皮、地毯）可以踩上去，不算佔用；高空的零件也不擋地面
        if z0 > 0.9 or z1 < 0.045:
            continue
        boxes.append((min(c.x for c in cs) - margin, max(c.x for c in cs) + margin, min(c.y for c in cs) - margin, max(c.y for c in cs) + margin))
    return boxes


def dress(style, count=14, seed=7, half=1.72, z=0.0, extra=(), roofs=None):
    """依主題在地表空位自動布置微縮小道具（不碰到既有零件、彼此保持間距）；extra＝額外的道具名稱"""
    prop_materials()
    ensure('lantern_red', '#ff5a3c', 0.5, emit='#ff3a1a', emit_strength=3)
    ensure('water_prop', '#7cc4e8', 0.08)
    ensure('rune', '#9fe8ff', 0.4, emit='#6fd8ff', emit_strength=2.5)
    ensure('holo', '#7ef0ff', 0.3, emit='#38d8ff', emit_strength=3)
    ensure('bark_prop', '#6b4423', 0.95)
    ensure('beacon_prop', '#ff4a2a', 0.5, emit='#ff3a1a', emit_strength=6)
    r = random.Random(seed)
    roofs = (style == 'tech') if roofs is None else roofs   # 科技風：設備也可以放在平坦的屋頂／平台上
    top = 1.6 if roofs else 0.9
    boxes = []   # 本次已放的道具（彼此避讓）
    bpy.context.view_layer.update()
    dg_ = bpy.context.evaluated_depsgraph_get()
    scene = bpy.context.scene

    def ground(px, py):
        """從 0.9 高往下打射線：只有落在裸地（或很薄的步道鋪面）才算空位；回傳地面高度或 None"""
        z0 = top
        for _ in range(4):   # 半透明的光束、玻璃不算佔用：穿過去繼續往下找
            hit, loc, _n, _i, obj, _m = scene.ray_cast(dg_, Vector((px, py, z0)), Vector((0, 0, -1)), distance=z0 + 0.3)
            if not hit:
                return None
            mat = obj.data.materials[0] if obj.type == 'MESH' and obj.data.materials else None
            if mat is None or getattr(mat, 'surface_render_method', '') != 'BLENDED':
                break
            z0 = loc.z - 0.002
        nm = obj.name.split('.')[0]
        if nm.lower().startswith('fx') or (loc.z > 0.004 and nm.startswith(('capstone', 'corner'))):
            return None
        if loc.z > (1.5 if roofs else 0.05) or (roofs and loc.z > 0.05 and _n.z < 0.95):
            return None
        return loc.z
    pool = list(STYLES[style]) + list(extra)
    placed = []
    cand = [(x * 0.06, y * 0.06) for x in range(-int(half / 0.06), int(half / 0.06) + 1) for y in range(-int(half / 0.06), int(half / 0.06) + 1)]
    r.shuffle(cand)
    # 偏好靠近外圍（中央通常是主角與動線）
    cand.sort(key=lambda p: -max(abs(p[0]), abs(p[1])) + r.random() * 0.9)
    n = 0
    for (x, y) in cand:
        if n >= count:
            break
        kind = pool[n % len(pool)] if n < len(pool) else r.choice(pool)
        rot = r.choice((0.0, math.pi / 2, math.pi, -math.pi / 2)) + (r.random() - 0.5) * 0.4
        fx, fy = FOOT[kind]
        ex = abs(math.cos(rot)) * fx + abs(math.sin(rot)) * fy
        ey = abs(math.sin(rot)) * fx + abs(math.cos(rot)) * fy
        if abs(x) + ex > half or abs(y) + ey > half:
            continue
        if any(x + ex > b[0] and x - ex < b[1] and y + ey > b[2] and y - ey < b[3] for b in boxes):
            continue
        pad = 0.04
        hs = [ground(x + sx * (ex + pad), y + sy * (ey + pad)) for sx in (-1, 0, 1) for sy in (-1, 0, 1)]
        if any(hv is None for hv in hs) or max(hs) - min(hs) > 0.03:
            continue
        gz = max(hs)
        if any(math.hypot(x - px, y - py) < 0.42 for (px, py) in placed):
            continue
        c, sn = math.cos(rot), math.sin(rot)
        for key, make in PROPS[kind]():
            # 每個零件在原點建好當原型；複本以道具中心旋轉
            o = inst(f'{key}', make, (x, y, z + gz), rot, group='props')
        placed.append((x, y))
        boxes.append((x - ex, x + ex, y - ey, y + ey))
        n += 1
    print(f'dress {style}: {n} props')
    return n


WALL_MATS = ('wall', 'wall_trim', 'house_wall', 'stone_soft', 'plaster', 'brick', 'stone', 'stone_light')


def articulate(mats=WALL_MATS, trim=None):
    """建築多層次拆解：替方盒狀的牆體自動加上勒腳（底座線腳）、腰線與出挑的簷口壓條，讓輪廓有凹凸陰影層次。
    只處理未旋轉或僅繞 Z 旋轉、寬深高都夠大的簡單方盒（頂點 ≤ 64），不動點擊動畫零件"""
    bpy.context.view_layer.update()
    n = 0
    for o in list(GROUPS.get('static', [])):
        if o.type != 'MESH' or not o.data.materials or len(o.data.vertices) > 64:
            continue
        if o.data.materials[0].name not in mats:
            continue
        if abs(o.rotation_euler.x) > 1e-3 or abs(o.rotation_euler.y) > 1e-3:
            continue
        xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
        dx, dy, dz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
        if dx < 0.45 or dy < 0.45 or dz < 0.4:
            continue
        cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        wc = o.matrix_world @ Vector((cx, cy, min(zs)))
        top = (o.matrix_world @ Vector((cx, cy, max(zs)))).z
        rz = o.rotation_euler.z
        tm = trim or ('wall_trim' if 'wall_trim' in MATS else 'white')
        box('plinth_course', (dx + 0.04, dy + 0.04, 0.05), (wc.x, wc.y, wc.z + 0.025), tm, rot=(0, 0, rz), bevel=0.008)
        box('cornice', (dx + 0.07, dy + 0.07, 0.04), (wc.x, wc.y, top - 0.01), tm, rot=(0, 0, rz), bevel=0.008)
        if dz > 0.85:
            box('belt', (dx + 0.03, dy + 0.03, 0.022), (wc.x, wc.y, wc.z + dz * 0.5), tm, rot=(0, 0, rz), bevel=0.004)
        n += 1
    print(f'articulate: {n} walls')
    return n


def place(kind, loc, rot=0.0):
    """在指定位置放一個道具（地表擠滿時，用來沿地塊邊緣壓頂石布置）"""
    prop_materials()
    ensure('holo', '#7ef0ff', 0.3, emit='#38d8ff', emit_strength=3)
    ensure('beacon_prop', '#ff4a2a', 0.5, emit='#ff3a1a', emit_strength=6)
    ensure('lantern_red', '#ff5a3c', 0.5, emit='#ff3a1a', emit_strength=3)
    ensure('rune', '#9fe8ff', 0.4, emit='#6fd8ff', emit_strength=2.5)
    for key, make in PROPS[kind]():
        inst(key, make, loc, rot, group='props')


# 道具調色盤：非發光的道具零件全部改用同一張小色票貼圖（每色一格），整組道具只剩 1 個材質＝1 次繪製；
# 發光零件（燈、燈籠、符文、全息）保留各自的發光材質。色票與既有貼圖材質同一種著色器，不增加著色器變體。
TEX_FLAT = {'wood': '#9a6b43', 'brick': '#b5653d', 'concrete': '#bdbab2', 'rock': '#8a8478', 'bark_prop': '#6b4423', 'grass': '#6fae5c'}


def _base_hex(m):
    if m.name in TEX_FLAT:
        return TEX_FLAT[m.name]
    c = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
    return '#' + ''.join(f'{int(round(min(1, max(0, v)) ** (1 / 2.2) * 255)):02x}' for v in c[:3])


def _palettize(objs):
    cells, seen = {}, set()
    for o in objs:
        m = o.data.materials[0]
        bsdf = m.node_tree.nodes['Principled BSDF']
        if bsdf.inputs['Emission Strength'].default_value > 0 or m.name.startswith('props_palette'):
            continue
        cells.setdefault(_base_hex(m), len(cells))
    if not cells:
        return
    C = 16
    img = Image.new('RGB', (C * len(cells), C))
    d = ImageDraw.Draw(img)
    for hx, i in cells.items():
        d.rectangle([i * C, 0, i * C + C - 1, C - 1], fill=hexrgb(hx))
    path = os.path.join(TEX_DIR, 'props_palette.png')
    img.save(path)
    if 'props_palette' not in MATS:
        material('props_palette', rough=0.7, tex=path)
    pal = MATS['props_palette']
    for o in objs:
        me = o.data
        if me.name in seen:
            continue
        m = me.materials[0]
        if m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value > 0 or m.name == 'props_palette':
            continue
        i = cells[_base_hex(m)]
        u = (i + 0.5) / len(cells)
        uvl = me.uv_layers.active or me.uv_layers.new()
        for lp in uvl.data:
            lp.uv = (u, 0.5)
        me.materials[0] = pal
        seen.add(me.name)
