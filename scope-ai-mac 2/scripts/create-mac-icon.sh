#!/bin/bash
set -euo pipefail

SOURCE="assets/scope-icon.png"
ICONSET="assets/scope-icon.iconset"
mkdir -p "$ICONSET"

# macOS iconutil requires these square PNG sizes in an iconset directory.
for size in 16 32 64 128 256 512; do
  sips -s format png -z "$size" "$size" "$SOURCE" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  if [ "$double" -le 1024 ]; then
    sips -s format png -z "$double" "$double" "$SOURCE" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
  fi
done

# Required canonical names for iconutil.
cp "$ICONSET/icon_16x16@2x.png" "$ICONSET/icon_32x32.png"
cp "$ICONSET/icon_32x32@2x.png" "$ICONSET/icon_64x64.png"
cp "$ICONSET/icon_128x128@2x.png" "$ICONSET/icon_256x256.png"
cp "$ICONSET/icon_256x256@2x.png" "$ICONSET/icon_512x512.png"
iconutil -c icns "$ICONSET" -o assets/scope-icon.icns
rm -rf "$ICONSET"
