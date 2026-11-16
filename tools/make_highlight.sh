#!/usr/bin/env bash
# 演示影片精華片段：從原始影片取 4 段 × 5 秒（12%、35%、58%、80% 處），淡入淡出串接成約 20 秒，
# 720p、H.264（CRF 22、碼率上限 1.4Mbps，單檔 ≤ 4MB）、無音軌、faststart（邊下載邊播放），並擷取封面圖。
# 用法：tools/make_highlight.sh <原始影片> <id>   → public/videos/<id>.mp4、public/videos/<id>.jpg
set -euo pipefail
SRC="$1"; ID="$2"; OUT="public/videos"
mkdir -p "$OUT"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
SEG=5; FADE=0.4
args=(); parts=""; inputs=""; i=0
for pct in 0.12 0.35 0.58 0.80; do
  st=$(awk -v d="$DUR" -v p="$pct" 'BEGIN{printf "%.2f", d*p}')
  # 輸入端快速跳轉（-ss 放在 -i 前）：只解碼需要的 5 秒，長片／1080p 也不會吃光記憶體
  args+=(-ss "$st" -t "$SEG" -i "$SRC")
  parts+="[${i}:v]setpts=PTS-STARTPTS,scale=-2:'min(720,ih)':flags=lanczos,fps=30,format=yuv420p,fade=t=in:st=0:d=${FADE},fade=t=out:st=$(awk -v s=$SEG -v f=$FADE 'BEGIN{print s-f}'):d=${FADE}[v${i}];"
  inputs+="[v${i}]"; i=$((i+1))
done
ffmpeg -y -v error -threads 2 "${args[@]}" -filter_complex "${parts}${inputs}concat=n=${i}:v=1:a=0[out]" -map "[out]" -an \
  -c:v libx264 -preset slow -crf 22 -maxrate 1400k -bufsize 2800k -profile:v high -pix_fmt yuv420p -movflags +faststart -threads 2 \
  "$OUT/$ID.mp4"
ffmpeg -y -v error -ss 1.2 -i "$OUT/$ID.mp4" -frames:v 1 -q:v 4 "$OUT/$ID.jpg"
echo "$ID $(du -h "$OUT/$ID.mp4" | cut -f1) $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$ID.mp4")s poster $(du -h "$OUT/$ID.jpg" | cut -f1)"
