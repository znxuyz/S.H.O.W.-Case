"""
《__TITLE__》3D 環境範本（由 tools/new_project.sh 複製成 tools/blender/build_env___ID__.py）

改寫指引：
  · 遠景依主題換地形色票、散佈物（樹、建築、浮島、雲）；鏡頭側（+X、-Y）保持淨空
  · 一定要呼叫 env.cradle(...) 讓主島「長」在環境裡：mound（岩丘）/ tiers（石台）/ tower（科技塔）/ books（書堆）/ cloud（雲墩）
  · 網站端環境一律改用 Lambert 材質、不參與陰影；預算 ≤ 20k 面、壓縮後 ≤ 600KB
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') if os.path.basename(os.path.dirname(os.path.abspath(__file__))) == 'templates' else os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import kit  # noqa: E402
import env  # noqa: E402
from kit import material, srgb  # noqa: E402

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'env___ID__.glb'
kit.reset()
kit.standard_materials()
kit.nature_materials()
material('cloud', srgb('#ffffff'), rough=1.0)
G = 'env'
FLOOR = -7.6
_, grid = env.terrain('__ID___valley', radius=70, res=80, floor_z=FLOOR, rim_h=8, valley_r=13, rough=2.4, seed=7,
                      palette=((0.0, '#6fae5c'), (0.5, '#8fc070'), (1.0, '#c4d49a')))
# 遠景散佈（TODO：換成主題相關的地標）
for i, (x, y, z) in enumerate(env.scatter(grid, 36, 12, 44, seed=3)):
    kit.tree((x, y, z), s=1.3 + (i % 5) * 0.2, group=G, detail=0)
for i in range(6):
    a = i / 6 * math.tau + 0.4
    env.cloud((math.cos(a) * 26, math.sin(a) * 26, 7 + (i % 3) * 1.5), s=1.6)
for (a, r, z, s) in [(1.0, 10.5, -2.4, 0.9), (2.7, 11.5, -1.2, 0.7)]:
    env.floating_islet((math.cos(a) * r, math.sin(a) * r, z), s, top='grass')
# 主島底座＋階梯
env.cradle(FLOOR, 'mound', mats=('rock', 'grass'), stair_mat='concrete')
kit.merge_group('env', 'env')
kit.export(OUT)
