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
