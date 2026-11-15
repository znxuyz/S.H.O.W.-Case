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
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print(f'objects={len([o for o in bpy.data.objects if o.type == "MESH"])} faces={tris}')
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
    finalize(o, mat, group, bevel=bevel, segs=3, uv=False)
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
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finalize(o, mat, group)


def torus(name, R, r, loc, mat, rot=(0, 0, 0), group='static', major=48, minor=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=major, minor_segments=minor)
    o = bpy.context.active_object
    o.name = name
    return finalize(o, mat, group)


def capsule(name, length, r, loc, mat, group='static'):
    """沿 X 軸的膠囊體（圓柱 + 兩端半球），平滑著色"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=length, location=loc, rotation=(0, math.pi / 2, 0))
    body = bpy.context.active_object
    parts = [body]
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r, location=(loc[0] + s * length / 2, loc[1], loc[2]))
        parts.append(bpy.context.active_object)
    for p in parts:
        bpy.ops.object.shade_smooth() if False else None
        for poly in p.data.polygons:
            poly.use_smooth = True
    with bpy.context.temp_override(active_object=body, object=body, selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    body.name = name
    return finalize(body, mat, group)


def plinth(top_mat, soil_mat='soil', rock_mat='rock', rim_mat='concrete', size=4.0, float_=True):
    """與網站 Plinth 一致的 4×4 地塊（頂面 z=0），附倒錐浮島岩底"""
    box('ground', (size - 0.16, size - 0.16, 0.28), (0, 0, -0.14), top_mat, bevel=0.02)
    for (sx, sy, x, y) in [(size, 0.16, 0, size / 2 - 0.08), (size, 0.16, 0, -size / 2 + 0.08), (0.16, size - 0.32, size / 2 - 0.08, 0), (0.16, size - 0.32, -size / 2 + 0.08, 0)]:
        box('rim', (sx, sy, 0.3), (x, y, -0.13), rim_mat, bevel=0.025)
    box('soil', (size - 0.06, size - 0.06, 0.48), (0, 0, -0.52), soil_mat, bevel=0.03)
    box('rockl', (size - 0.18, size - 0.18, 0.4), (0, 0, -0.96), rock_mat, bevel=0.04)
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


def tree(loc, s=1.0, kind='round', leaf='leaf', leaf2='leaf_dark', trunk='bark', group='static', detail=2):
    """detail：樹冠細分等級（遠景用 0–1 以節省面數）"""
    x, y, z = loc
    cyl('trunk', 0.06 * s, 0.6 * s, (x, y, z + 0.3 * s), trunk, verts=8 if detail > 1 else 5, group=group)
    if kind == 'round':
        for (dx, dy, dz, r, m) in [(0, 0, 0.82, 0.32, leaf2), (-0.12, 0.05, 0.95, 0.24, leaf), (0.12, -0.06, 0.92, 0.23, leaf), (0.03, 0.03, 1.15, 0.2, leaf), (0.06, 0.12, 0.72, 0.18, leaf2)]:
            ico('crown', r * s, (x + dx * s, y + dy * s, z + dz * s), m, sub=detail, group=group)
    else:
        for i, (r, h, dz) in enumerate([(0.38, 0.5, 0.55), (0.3, 0.45, 0.85), (0.21, 0.4, 1.12), (0.12, 0.34, 1.35)]):
            cone('pine', r * s, 0.0, h * s, (x, y, z + dz * s), leaf2 if i % 2 == 0 else leaf, verts=9, group=group)


def nature_materials():
    material('leaf', srgb('#4fbf73'), rough=0.85)
    material('leaf_dark', srgb('#2f8f5b'), rough=0.9)
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
