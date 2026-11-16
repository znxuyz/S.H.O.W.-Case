#!/usr/bin/env bash
# 首頁群島用的輕量版模型（Draco 壓縮、上限 200KB）：移除點擊動畫節點並合併網格、簡化幾何、貼圖縮到 128px
# 用法：tools/blender/build_map_lod.sh [名稱 ...]（預設：所有非 env 模型）
set -euo pipefail
mkdir -p public/models/map
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for f in public/models/*.glb; do b=$(basename "$f" .glb); [[ $b == env_* ]] || names+=("$b"); done
fi
tmp="$(mktemp -d)"
for n in "${names[@]}"; do
  # 先拿掉首頁用不到的點擊動畫節點並合併同材質網格（見 map_lod_strip.mjs），再簡化與縮貼圖
  node tools/blender/map_lod_strip.mjs "public/models/$n.glb" "$tmp/$n.glb" | grep '^strip'
  ./node_modules/.bin/gltf-transform optimize "$tmp/$n.glb" "public/models/map/$n.glb" \
    --compress draco --texture-compress webp --texture-size 128 \
    --simplify true --simplify-ratio 0.2 --simplify-error 0.02 --join true --flatten false 2>&1 | tail -1
done
