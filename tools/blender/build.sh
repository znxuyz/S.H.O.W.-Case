#!/usr/bin/env bash
# 用法：tools/blender/build.sh <名稱>   例如 tools/blender/build.sh tianmu
# 執行 tools/blender/build_<名稱>.py → 壓縮 → public/models/<名稱>.glb
set -euo pipefail
NAME="$1"
PY="${BLENDER_PY:-.blender-venv/bin/python}"
RAW="$(mktemp -d)/${NAME}-raw.glb"
"$PY" "tools/blender/build_${NAME}.py" "$RAW" | grep -E "^(objects=|exported)"
./node_modules/.bin/gltf-transform optimize "$RAW" "public/models/${NAME}.glb" \
  --compress meshopt --texture-compress webp --texture-size 512 --simplify false --join false --flatten false | tail -1
