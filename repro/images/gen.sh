#!/bin/bash
colors=("230,60,60" "60,160,80" "60,90,200" "220,160,40" "160,60,200" "40,180,180" "200,100,150" "140,140,140" "80,140,60" "190,120,50")
for i in $(seq 1 10); do
  idx=$((i-1))
  hex=$(echo ${colors[$idx]} | awk -F, '{printf "#%02x%02x%02x", $1, $2, $3}')
  convert -size 1600x1200 "xc:$hex" -font DejaVu-Sans-Bold -gravity center -pointsize 200 -fill white -annotate 0 "IMG-$i" "base-$i.jpg" || echo "FAIL base $i"
  for v in 1500 500 320 160; do
    convert "base-$i.jpg" -resize ${v}x "v${v}-$i.jpg" || echo "FAIL v$v $i"
  done
done
