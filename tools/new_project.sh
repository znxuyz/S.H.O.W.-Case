#!/usr/bin/env bash
# 一鍵新增作品的建置管線（完整流程見 CLAUDE.md「新增作品 SOP」與 /add-project 指令）
#
# 用法：tools/new_project.sh <id> [--title "作品名"] [--accent "#c2410c"] [--skip-qa]
#   1. 若 tools/blender/build_<id>.py / build_env_<id>.py 不存在，從 tools/blender/templates/ 複製範本
#   2. Blender 建出主模型、3D 環境 → public/models/<id>.glb、env_<id>.glb
#   3. 產生首頁輕量版 → public/models/map/<id>.glb
#   4. 檢查檔案大小與面數預算；npm run build
#   5. 若 projects.ts 已有此作品：啟動預覽伺服器，跑 probe.cjs（BUDGET=1）與 fx.cjs，輸出 PASS / FAIL
set -euo pipefail
cd "$(dirname "$0")/.."

ID="${1:?用法：tools/new_project.sh <id> [--title 名稱] [--accent #色碼] [--skip-qa]}"; shift
TITLE="$ID"; ACCENT="#c8a869"; SKIP_QA=0
while [ $# -gt 0 ]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --accent) ACCENT="$2"; shift 2 ;;
    --skip-qa) SKIP_QA=1; shift ;;
    *) echo "未知參數：$1"; exit 1 ;;
  esac
done
[[ "$ID" =~ ^[a-z][a-z0-9_]*$ ]] || { echo "id 只能用小寫英數與底線（例如 newapp）"; exit 1; }
export BLENDER_PY="${BLENDER_PY:-.blender-venv/bin/python}"
[ -x "$BLENDER_PY" ] || { echo "找不到 Blender Python（$BLENDER_PY）；見 UPGRADE_ROADMAP.md「環境恢復」"; exit 1; }

say() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }

say "1/5 建模腳本"
for kind in model env; do
  if [ "$kind" = model ]; then dst="tools/blender/build_${ID}.py"; else dst="tools/blender/build_env_${ID}.py"; fi
  if [ -f "$dst" ]; then echo "沿用 $dst"; else
    sed -e "s/__ID__/${ID}/g" -e "s/__TITLE__/${TITLE}/g" -e "s/__ACCENT__/${ACCENT}/g" "tools/blender/templates/build_${kind}.py" > "$dst"
    echo "已從範本建立 $dst（記得依作品主題改寫）"
  fi
done

say "2/5 Blender 建模"
tools/blender/build.sh "$ID"
tools/blender/build.sh "env_${ID}"

say "3/5 首頁輕量版"
tools/blender/build_map_lod.sh "$ID"

say "4/5 檔案大小與面數預算"
check() { # 檔案 上限KB
  local kb=$(( $(stat -c %s "$1") / 1024 ))
  if [ "$kb" -le "$2" ]; then echo "PASS $1 ${kb}KB ≤ $2KB"; else echo "FAIL $1 ${kb}KB > $2KB"; fi
}
check "public/models/${ID}.glb" 1536
check "public/models/env_${ID}.glb" 1536
check "public/models/map/${ID}.glb" 200
node -e '
const fs = require("fs");
for (const [f, max] of [[process.argv[1], 15000], [process.argv[2], 40000]]) {
  const b = fs.readFileSync(f); const n = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + n).toString());
  let tris = 0; for (const m of j.meshes || []) for (const p of m.primitives) { const a = j.accessors[p.indices ?? p.attributes.POSITION]; tris += (p.indices !== undefined ? a.count : a.count) / 3; }
  console.log(`${tris <= max ? "PASS" : "FAIL"} ${f} ${Math.round(tris)} 面 ≤ ${max}`);
}' "public/models/${ID}.glb" "public/models/env_${ID}.glb"
npm run build 2>&1 | grep -E "built|error" || true

say "5/5 效能與動畫檢查"
if [ "$SKIP_QA" = 1 ]; then echo "略過（--skip-qa）"; exit 0; fi
if ! grep -q "id: '${ID}'" src/data/projects.ts; then
  echo "projects.ts 還沒有 id: '${ID}' 的作品；加入後再執行：tools/new_project.sh ${ID}"; exit 0
fi
if ! curl -s -o /dev/null http://localhost:4173/S.H.O.W.-Case/; then
  (npx vite preview --port 4173 --strictPort > /dev/null 2>&1 &)
  until curl -s -o /dev/null http://localhost:4173/S.H.O.W.-Case/; do sleep 1; done
fi
BUDGET=1 QA_WAIT="${QA_WAIT:-50000}" node tools/qa/probe.cjs "$ID" | grep -E "^BUDGET|errors"
QA_WAIT="${QA_WAIT:-40000}" node tools/qa/fx.cjs "$ID" | grep -E "←|missing"
