"""
介紹頁的 3D 環境（遠景）共用零件：讓「前景箱庭」與「背景」在同一個 3D 世界裡。

座標：Blender Z 朝上；箱庭浮在原點，地塊底部約在 z = -3.5。
地形放在 z ≈ -7 以下的谷地，向外逐漸隆起成山，半徑約 60。
地形用「頂點色」上色（不需貼圖、檔案小）；其餘物件沿用 kit 的材質與合併流程。
"""
import math

import bpy
import bmesh
import numpy as np

import kit


def vcolor_material(name, rough=0.95, metal=0.0, emit=None, emit_strength=0.0):
    """使用頂點色（Color Attribute）的材質"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    kit.MATS[name] = m
    return m


def _noise2(x, y, seed=0, octaves=4):
    """平滑 2D 值噪聲（numpy 向量化）"""
    rng = np.random.default_rng(seed)
    total = np.zeros_like(x)
    amp, freq = 1.0, 1.0
    for _ in range(octaves):
        gx, gy = x * freq, y * freq
        ix, iy = np.floor(gx).astype(int), np.floor(gy).astype(int)
        fx, fy = gx - ix, gy - iy
        perm = rng.integers(0, 1 << 30, 4096)
        def h(a, b):
            return (perm[(a * 73856093 ^ b * 19349663) % 4096] % 10000) / 10000.0
        ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        v = (h(ix, iy) * (1 - ux) + h(ix + 1, iy) * ux) * (1 - uy) + (h(ix, iy + 1) * (1 - ux) + h(ix + 1, iy + 1) * ux) * uy
        total += v * amp
        amp *= 0.5
        freq *= 2.0
    return total / (2 - 2 ** (1 - octaves))


def terrain(name, radius=62, res=72, floor_z=-7.5, rim_h=9.0, valley_r=12.0, rough=3.0, seed=1,
            palette=((0.0, '#4f8a4a'), (0.5, '#7fb35f'), (0.8, '#a8c97a'), (1.0, '#e8e2c8')), flatten=None, patches=None):
    """
    谷地地形：中央平坦低窪、向外隆起成環形山。
    palette：依「相對高度」上色的 (位置, 顏色) 漸層；flatten(x, y) 回傳 0..1 可壓平某些區域（湖、廣場）。
    patches：[(顏色, 門檻)]，以低頻噪聲在地表混入色塊（田地、樹林、岩壁），讓地面有拼布般的層次。
    """
    xs = np.linspace(-radius, radius, res)
    X, Y = np.meshgrid(xs, xs)
    R = np.hypot(X, Y)
    n = _noise2(X / 14 + 10, Y / 14 + 10, seed)
    ridge = np.clip((R - valley_r) / (radius - valley_r), 0, 1) ** 1.6
    Z = floor_z + ridge * rim_h * (0.55 + n * 0.9) + (n - 0.5) * rough * (0.25 + ridge)
    if flatten is not None:
        f = flatten(X, Y)
        Z = Z * (1 - f) + (floor_z - 0.2) * f
    mesh = bpy.data.meshes.new(name)
    verts = [(float(X[j, i]), float(Y[j, i]), float(Z[j, i])) for j in range(res) for i in range(res)]
    faces = []
    for j in range(res - 1):
        for i in range(res - 1):
            if R[j, i] > radius and R[j + 1, i + 1] > radius:
                continue
            a = j * res + i
            faces.append((a, a + 1, a + res + 1, a + res))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # 頂點色：依相對高度與坡度在色票間插值
    zmin, zmax = Z.min(), Z.max()
    stops = [(p, np.array(kit.hexrgb(c), dtype=np.float32) / 255.0) for p, c in palette]
    col = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    P1 = _noise2(X / 7 + 3, Y / 7 + 5, seed + 7, 3).ravel()
    P2 = _noise2(X / 4 + 9, Y / 4 + 1, seed + 13, 2).ravel()
    for k, v in enumerate(mesh.vertices):
        t = (v.co.z - zmin) / max(zmax - zmin, 1e-6)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if t <= p1:
                u = (t - p0) / max(p1 - p0, 1e-6)
                c = c0 * (1 - u) + c1 * u
                break
        else:
            c = stops[-1][1]
        if patches:
            for (pc, thr), pn in zip(patches, (P1[k], P2[k])):
                if pn > thr:
                    w = min(1.0, (pn - thr) / 0.06)
                    c = c * (1 - w * 0.85) + np.array(kit.hexrgb(pc), dtype=np.float32) / 255.0 * w * 0.85
        jitter = 0.86 + P2[k] * 0.22 + (hash((k * 2654435761) & 0xffffffff) % 1000) / 1000 * 0.08
        rgb = np.clip(c * jitter, 0, 1) ** 2.2
        col.data[k].color = (*rgb, 1.0)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = False
    mat = kit.MATS.get('terrain_vc') or vcolor_material('terrain_vc')
    obj.data.materials.append(mat)
    kit.GROUPS.setdefault('env', []).append(obj)
    return obj, (X, Y, Z)


def height_at(grid, x, y):
    X, Y, Z = grid
    res = X.shape[0]
    radius = X[0, -1]
    i = int(round((x + radius) / (2 * radius) * (res - 1)))
    j = int(round((y + radius) / (2 * radius) * (res - 1)))
    i, j = max(0, min(res - 1, i)), max(0, min(res - 1, j))
    return float(Z[j, i])


def scatter(grid, count, rmin, rmax, seed, avoid=None):
    """在 rmin..rmax 的環帶上散佈點（回傳地面座標）"""
    rnd = kit.random.Random(seed)
    out = []
    tries = 0
    while len(out) < count and tries < count * 40:
        tries += 1
        a = rnd.random() * math.tau
        r = rmin + rnd.random() * (rmax - rmin)
        x, y = math.cos(a) * r, math.sin(a) * r
        if avoid and avoid(x, y):
            continue
        if all(math.hypot(x - p[0], y - p[1]) > 1.6 for p in out):
            out.append((x, y, height_at(grid, x, y)))
    return out


def cloud(loc, s=1.0, mat='cloud', group='env'):
    x, y, z = loc
    for (dx, dy, dz, r) in [(0, 0, 0, 1.0), (1.1, 0.2, 0.2, 0.75), (-1.0, -0.1, 0.1, 0.8), (0.4, -0.5, 0.45, 0.6), (-0.4, 0.4, 0.5, 0.55)]:
        kit.ico('cloud', r * s, (x + dx * s, y + dy * s, z + dz * s), mat, sub=1, scale=(1.25, 1.0, 0.7), group=group)


def floating_islet(loc, s=1.0, top='grass', rock='rock', group='env'):
    """環繞主島的小浮島（倒錐岩底 + 草頂 + 一棵樹）"""
    x, y, z = loc
    kit.cyl('islet_top', 0.9 * s, 0.25 * s, (x, y, z), top, verts=9, group=group, bevel=0.0)
    bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=0.95 * s, radius2=0.05, depth=1.6 * s, location=(x, y, z - 0.9 * s), rotation=(math.pi, 0, 0))
    kit.finalize(bpy.context.active_object, rock, group)


def finish(path):
    """合併環境物件（依材質）並匯出"""
    kit.merge_group('env', 'env')
    kit.export(path)


# ───────────────────────── 主島底座：把箱庭「嵌」進環境 ─────────────────────────
def _ring_r(z, top, floor, r_top, r_base):
    t = (top - z) / max(0.01, top - floor)
    return r_top + (r_base - r_top) * t


def stairs(floor, top, r_top, r_base, mat, angle=-0.25, width=1.0, rise=0.28, group='env', rail=None):
    """沿底座外側往下的階梯（朝鏡頭側偏一點，讓主島與地面有路相連）"""
    n = max(3, int((top - floor) / rise))
    ca, sa = math.cos(angle), math.sin(angle)
    for k in range(n):
        z = top - k * rise
        r = _ring_r(z, top, floor, r_top, r_base) + 0.25
        x, y = ca * r, sa * r
        kit.box('stair', (0.5, width, rise), (x, y, z - rise / 2), mat, rot=(0, 0, angle), group=group, bevel=0.02)
        if rail and k % 3 == 0:
            for s in (-1, 1):
                kit.cyl('stair_post', 0.04, 0.5, (x - sa * s * width / 2, y + ca * s * width / 2, z + 0.25), rail, verts=6, group=group)


def cradle(floor, style='mound', top=-1.25, r_top=3.2, mats=('rock', 'grass'), accent=None, stair_mat='concrete', angle=-0.25, seed=3, group='env'):
    """
    主島正下方的底座，從環境地面升起、接住浮島的倒錐岩底：
      mound：岩丘＋草頂（校園、森林）    tiers：層層石台（仙境、古風）
      tower：科技塔柱＋發光環（科技、演算法）  books：巨書堆（文件、行政）
      cloud：雲墩（雲海上的主題）
    """
    rnd = kit.random.Random(seed)
    rock, cap = mats[0], mats[1]
    r_base = r_top * 1.8
    if style == 'mound':
        layers = 6
        for k in range(layers):
            z1 = top - (top - floor) * k / layers
            z0 = top - (top - floor) * (k + 1) / layers
            r = _ring_r((z0 + z1) / 2, top, floor, r_top, r_base)
            kit.cyl('cradle_rock', r, z1 - z0 + 0.05, (rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), (z0 + z1) / 2), rock, verts=11 + k, group=group)
        kit.cyl('cradle_cap', r_top + 0.12, 0.22, (0, 0, top - 0.08), cap, verts=16, group=group)
        for i in range(14):
            a = rnd.random() * math.tau
            r = r_base * rnd.uniform(0.9, 1.15)
            kit.ico('cradle_boulder', rnd.uniform(0.35, 0.8), (math.cos(a) * r, math.sin(a) * r, floor + 0.15), rock, sub=1, scale=(1.2, 1, 0.7), group=group)
        stairs(floor, top, r_top, r_base, stair_mat, angle=angle, group=group)
    elif style == 'tiers':
        n = 4
        for k in range(n):
            z1 = top - (top - floor) * k / n
            z0 = top - (top - floor) * (k + 1) / n
            r = r_top + k * (r_base - r_top) / (n - 1)
            kit.cyl('tier', r, z1 - z0, (0, 0, (z0 + z1) / 2), rock, verts=8, group=group, bevel=0.04)
            if accent:
                kit.torus('tier_trim', r + 0.02, 0.05, (0, 0, z1 - 0.06), accent, group=group, major=8, minor=4)
            # 每層邊緣的小石燈／柱
            for j in range(8):
                a = j * math.tau / 8 + math.pi / 8
                kit.cyl('tier_post', 0.08, 0.5, (math.cos(a) * (r - 0.25), math.sin(a) * (r - 0.25), z1 + 0.25), cap, verts=6, group=group)
        stairs(floor, top, r_top, r_base, stair_mat, angle=angle, width=1.2, group=group, rail=cap)
    elif style == 'tower':
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r_top * 1.05, radius2=r_top * 0.7, depth=top - floor, location=(0, 0, (top + floor) / 2))
        kit.finalize(bpy.context.active_object, rock, group)
        kit.cyl('tower_top', r_top + 0.1, 0.3, (0, 0, top - 0.15), rock, verts=6, group=group, bevel=0.04)
        if accent:
            z = top - 1.2
            while z > floor + 0.5:
                rr = _ring_r(z, top, floor, r_top * 0.7, r_top * 1.05)
                kit.torus('tower_ring', rr + 0.12, 0.05, (0, 0, z), accent, group=group, major=6, minor=4)
                z -= 1.6
            for j in range(6):
                a = j * math.tau / 6
                kit.beam('tower_strut', (math.cos(a) * r_top * 1.1, math.sin(a) * r_top * 1.1, top - 0.2), (math.cos(a) * r_top * 1.9, math.sin(a) * r_top * 1.9, floor), 0.12, cap, group=group)
    elif style == 'books':
        cols = mats[2:] if len(mats) > 2 else (rock, cap)
        z = floor
        k = 0
        h = (top - floor) / 5
        while z < top - 0.01:
            w = r_base * 1.2 - (r_base * 1.2 - r_top * 1.7) * (k / 4)
            kit.box('giant_book', (w, w * 0.72, h * 0.92), (rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), z + h / 2), cols[k % len(cols)], rot=(0, 0, rnd.uniform(-0.25, 0.25)), group=group, bevel=0.06)
            kit.box('giant_pages', (w - 0.2, w * 0.72 + 0.04, h * 0.7), (rnd.uniform(-0.1, 0.1), 0, z + h / 2), 'white', rot=(0, 0, rnd.uniform(-0.1, 0.1)), group=group, bevel=0.02)
            z += h
            k += 1
    elif style == 'cloud':
        for i in range(16):
            a = i / 16 * math.tau
            r = r_top * rnd.uniform(0.35, 0.95)
            kit.ico('cradle_cloud', rnd.uniform(0.9, 1.5), (math.cos(a) * r, math.sin(a) * r, top + rnd.uniform(-0.6, 0.2)), rock, sub=2, scale=(1.3, 1.1, 0.6), group=group)
        for i in range(10):
            a = i / 10 * math.tau + 0.3
            r = r_top * 1.25
            kit.ico('cradle_cloud', rnd.uniform(0.7, 1.1), (math.cos(a) * r, math.sin(a) * r, top - 0.9 + rnd.uniform(-0.3, 0.3)), rock, sub=2, scale=(1.4, 1.1, 0.55), group=group)
