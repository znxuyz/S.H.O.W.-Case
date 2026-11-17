"""
《__TITLE__》—— 主模型範本（由 tools/new_project.sh 複製成 tools/blender/build___ID__.py）

改寫指引（見 CLAUDE.md「新增作品 SOP」）：
  1. 先用一段話寫下「專案核心」與「主角物件」：模型要表達作品在做什麼，不一定是建築（書、平板、信箱、祭壇…）
  2. 4×4 地塊、頂面 z = 0；Blender 的 -Y 方向＝網站鏡頭正面（鏡頭在 +X、-Y 側，那一側保持淨空）
  3. 每個熱點對應一個具體物件，並把它的零件放進 group='Fx_<名稱>'，最後 kit.fx_node(名稱, 樞紐)；
     樞紐＝轉軸或鉸鏈位置（掀蓋放在蓋子後緣、門放在門軸、吊臂放在旋轉中心）
  4. 平常看不到、點擊才出現的零件放 group='FxHide_<名稱>'（例如蓋印後的印記、雷射掃描線）
  5. 常駐動畫用節點命名：Spin*/SpinR*/Bob*/Pulse*/Billboard*/Lit_N（見 ModelDiorama.tsx 開頭說明）
  6. 預算：≤ 18k 三角面（看建模輸出的 tris-top 找最吃面數的零件）、Draco 壓縮後 ≤ 1.5MB；不要用點光源（網站端已全面移除）
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') if os.path.basename(os.path.dirname(os.path.abspath(__file__))) == 'templates' else os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import kit  # noqa: E402
from kit import box, cone, cyl, label_block, material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else '__ID__.glb'
ACCENT = '__ACCENT__'
kit.reset()
kit.standard_materials()
kit.nature_materials()
kit.detail_materials()

material('accent', srgb(ACCENT), rough=0.5)
material('wall', srgb('#f6f1e7'), rough=0.85)
material('sign', rough=0.6, tex=kit.label_texture('__ID___sign', '__TITLE__', ACCENT, size=(360, 110), font_size=44))

# ── 地塊 ──
kit.plinth('grass', soil_mat='soil', rock_mat='rock', rim_mat='concrete')

# ── 主角（TODO：換成代表作品核心的物件） ──
box('hero_base', (1.4, 1.0, 0.7), (0, 0.4, 0.35), 'wall', bevel=0.03)
cone('hero_roof', 0.95, 0.0, 0.5, (0, 0.4, 0.95), 'accent', verts=4, rot=(0, 0, math.pi / 4))
label_block('hero_sign', (0.9, 0.03, 0.26), (0, -0.12, 0.5), 'sign', bevel=0.004, face='front')

# ── 熱點物件 1（範例）：可掀開的盒子 → 熱點 fx: { node: 'Fx_lid', kind: 'hinge', amt: -1.2 } ──
box('box_body', (0.4, 0.3, 0.24), (-1.1, -1.0, 0.12), 'accent', bevel=0.02)
box('box_lid', (0.42, 0.32, 0.05), (-1.1, -1.0, 0.265), 'wall', bevel=0.01, group='Fx_lid')
# 點擊時才出現的零件（reveal）：
box('box_glow', (0.3, 0.2, 0.02), (-1.1, -1.0, 0.3), 'lamp', bevel=0, group='FxHide_glow')

# ── 熱點物件 2（範例）：會轉的招牌 → fx: { node: 'Fx_sign', kind: 'whirl', amt: 6.2832 } ──
cyl('sign_pole', 0.03, 0.8, (1.2, -1.1, 0.4), 'concrete', verts=8)
label_block('spin_sign', (0.5, 0.03, 0.2), (1.2, -1.1, 0.82), 'sign', bevel=0.004, face='front', group='Fx_sign')

# ── 點綴 ──
for (x, y, s) in [(-1.6, 1.5, 0.6), (1.6, 1.4, 0.55), (1.65, -0.2, 0.45)]:
    kit.tree((x, y, 0), s=s)

# ── 點擊動畫節點（樞紐＝轉軸／鉸鏈位置） ──
kit.fx_node('Fx_lid', (-1.1, -0.84, 0.29))      # 蓋子後緣（+Y 側）為鉸鏈
kit.fx_node('FxHide_glow', (-1.1, -1.0, 0.3))
kit.fx_node('Fx_sign', (1.2, -1.1, 0.82))

# ── 合併、匯出 ──
kit.merge_group('static', '__ID__')
kit.export(OUT)
