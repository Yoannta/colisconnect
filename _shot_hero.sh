#!/bin/bash
# Capture le site EN LIGNE au viewport exact de Yoyo (1314x802)
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
OUT="D:\\hermes\\scripts\\shots-live"
URL="https://yoannta.github.io/colisconnect/index.html?v=20261013d"
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1314,802 --force-device-scale-factor=2 --virtual-time-budget=8000 \
  --screenshot="$OUT\\hero-1314-dsf2.png" "$URL"
echo "exit=$?"
ls -la /d/hermes/scripts/shots-live/hero-1314-dsf2.png
