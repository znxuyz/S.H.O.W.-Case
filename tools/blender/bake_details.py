"""
細節貼圖烘焙（一次性；輸出到 tools/blender/detail/，由 detail_maps.mjs 套用到所有主模型）

以 Blender Shader 節點（Noise Texture → ColorRamp → Bump／Roughness）建立四種程序化材質，
用 Cycles 烘焙成可無縫重複的 512×512 貼圖：
    stone   石材顆粒（細碎凹凸＋粗糙度斑駁）
    wood    木紋（沿單一方向拉長的紋理）
    metal   金屬拉絲（細長條紋、粗糙度微變化）
    plaster 灰泥／漆面（很柔和的起伏，給一般材質去除塑膠感）
每種輸出 <名>_normal.png（切線空間法線）與 <名>_rough.png（G 通道＝粗糙度倍率 0.7–1.0、B＝1，
依 glTF 規格會再乘上各材質自己的 roughness／metallic 數值）。

無縫：把 UV 對映到 4D 環面座標（cos/sin 兩組）再取 4D 噪聲，左右上下自然銜接。
用法：.blender-venv/bin/python tools/blender/bake_details.py
"""
import math
import os

import bpy

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'detail')
os.makedirs(OUT, exist_ok=True)
SIZE = 512

# 名稱: (u 方向半徑, v 方向半徑, 噪聲尺度, 細節, 凹凸強度, 粗糙度 ColorRamp 兩端)
FAMILIES = {
    'stone': (1.0, 1.0, 9.0, 8.0, 0.55, (0.72, 1.0)),
    'wood': (0.35, 3.2, 3.0, 6.0, 0.35, (0.78, 1.0)),
    'metal': (0.06, 6.0, 4.0, 4.0, 0.18, (0.7, 1.0)),
    'plaster': (1.0, 1.0, 3.5, 3.0, 0.18, (0.85, 1.0)),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.render.bake.margin = 0

bpy.ops.mesh.primitive_plane_add(size=2)
plane = bpy.context.active_object


def tile_noise(nt, ru, rv, scale, detail):
    """UV → (cos2πu·ru, sin2πu·ru, cos2πv·rv) 與 W = sin2πv·rv → 4D Noise（無縫）"""
    uv = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(uv.outputs['UV'], sep.inputs[0])

    def trig(src, fn, r):
        m = nt.nodes.new('ShaderNodeMath'); m.operation = 'MULTIPLY'; m.inputs[1].default_value = 2 * math.pi
        nt.links.new(src, m.inputs[0])
        t = nt.nodes.new('ShaderNodeMath'); t.operation = fn
        nt.links.new(m.outputs[0], t.inputs[0])
        k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = r
        nt.links.new(t.outputs[0], k.inputs[0])
        return k.outputs[0]

    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(trig(sep.outputs['X'], 'COSINE', ru), comb.inputs['X'])
    nt.links.new(trig(sep.outputs['X'], 'SINE', ru), comb.inputs['Y'])
    nt.links.new(trig(sep.outputs['Y'], 'COSINE', rv), comb.inputs['Z'])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = detail
    noise.inputs['Roughness'].default_value = 0.6
    nt.links.new(comb.outputs[0], noise.inputs['Vector'])
    nt.links.new(trig(sep.outputs['Y'], 'SINE', rv), noise.inputs['W'])
    return noise.outputs['Fac']


for name, (ru, rv, scale, detail, bump_k, (r0, r1)) in FAMILIES.items():
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    fac = tile_noise(nt, ru, rv, scale, detail)
    # ColorRamp：把噪聲壓成粗糙度倍率範圍
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (r0, r0, r0, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (r1, r1, r1, 1)
    nt.links.new(fac, ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Roughness'])
    # Bump：噪聲當高度 → 法線
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = bump_k
    bump.inputs['Distance'].default_value = 0.02
    nt.links.new(fac, bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    plane.data.materials.clear()
    plane.data.materials.append(mat)

    for kind, bake_type in (('normal', 'NORMAL'), ('rough', 'ROUGHNESS')):
        img = bpy.data.images.new(f'{name}_{kind}', SIZE, SIZE, float_buffer=False)
        img.colorspace_settings.name = 'Non-Color'
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.nodes.active = tex
        tex.select = True
        bpy.ops.object.select_all(action='DESELECT')
        plane.select_set(True)
        bpy.context.view_layer.objects.active = plane
        bpy.ops.object.bake(type=bake_type, normal_space='TANGENT', use_clear=True, margin=0)
        if kind == 'rough':
            # glTF metallicRoughness：G＝粗糙度倍率、B＝金屬度倍率（1）
            px = list(img.pixels)
            for i in range(0, len(px), 4):
                g = px[i]
                px[i], px[i + 1], px[i + 2], px[i + 3] = 1.0, g, 1.0, 1.0
            img.pixels = px
        img.filepath_raw = os.path.join(OUT, f'{name}_{kind}.png')
        img.file_format = 'PNG'
        img.save()
        nt.nodes.remove(tex)
        print('baked', name, kind)
