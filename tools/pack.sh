#!/bin/sh
# Builds the zip to upload to the Chrome Web Store: dist/morning-brief-<version>.zip
set -e
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/morning-brief-$VERSION.zip"
mkdir -p dist && rm -f "$OUT"
zip -qr "$OUT" manifest.json background.js css fonts icons js pages host/host.mjs host/guard.mjs host/install.sh -x '*.DS_Store'
echo "$OUT ($(du -h "$OUT" | cut -f1))"
