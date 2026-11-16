#!/usr/bin/env bash
# 完整介紹影片（串流最佳化）：720p H.264（CRF 24、碼率上限 1Mbps）＋ AAC 96k、每 2 秒一個關鍵畫格（拖曳進度條立即跳轉）、
# faststart（索引放檔頭，下載幾百 KB 就能開始播放，其餘邊播邊載）→ public/videos/<id>-full.mp4
# 用法：tools/make_fullvideo.sh <原始影片> <id>
set -euo pipefail
SRC="$1"; ID="$2"; OUT="public/videos"
mkdir -p "$OUT"
ffmpeg -y -v error -threads 2 -i "$SRC" -map 0:v:0 -map 0:a:0? \
  -vf "scale=-2:'min(720,ih)':flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -crf 24 -maxrate 1000k -bufsize 2000k -g 60 -keyint_min 60 -sc_threshold 0 -profile:v high -threads 2 \
  -c:a aac -b:a 96k -ac 2 -movflags +faststart "$OUT/$ID-full.mp4"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$ID-full.mp4")
echo "$ID-full $(du -h "$OUT/$ID-full.mp4" | cut -f1) $(printf '%d:%02d' $(( ${d%.*} / 60 )) $(( ${d%.*} % 60 )))"
