#!/usr/bin/env bash
# 用法：tools/blender/build.sh <名稱>   例如 tools/blender/build.sh tianmu
# 執行 tools/blender/build_<名稱>.py → 套用程序化細節貼圖（主模型）→ Draco 壓縮＋WebP 貼圖 → public/models/<名稱>.glb
set -euo pipefail
NAME="$1"
PY="${BLENDER_PY:-.blender-venv/bin/python}"
TMP="$(mktemp -d)"
RAW="$TMP/${NAME}-raw.glb"
"$PY" "tools/blender/build_${NAME}.py" "$RAW" | grep -E "^(objects=|exported|tris-top|orbit-clear|dress|articulate|Traceback|  File|[A-Za-z]*Error)"
if [[ "$NAME" != env_* ]]; then
  # 主模型：掛上共用的法線／粗糙度細節貼圖（環境在網站端用 Lambert，不需要）
  node tools/blender/detail_maps.mjs "$RAW" "$TMP/${NAME}-detail.glb"
  RAW="$TMP/${NAME}-detail.glb"
fi
# Draco 幾何壓縮（網站以自架解碼器 public/draco/ 在背景 worker 解碼）；貼圖 WebP、上限 512px
./node_modules/.bin/gltf-transform optimize "$RAW" "public/models/${NAME}.glb" \
  --compress draco --texture-compress webp --texture-size 512 --simplify false --join false --flatten false | tail -1
