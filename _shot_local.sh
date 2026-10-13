#!/bin/bash
# Capture LOCALE (serveur 8899) au viewport exact 1314x802
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
OUT="D:\\hermes\\scripts\\shots-live"
URL="http://127.0.0.1:8899/index.html?v=local-fix"
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1314,802 --force-device-scale-factor=2 --virtual-time-budget=8000 \
  --screenshot="$OUT\\hero-LOCAL-fix.png" "$URL" 2>/dev/null
echo "exit=$?"
ls -la /d/hermes/scripts/shots-live/hero-LOCAL-fix.png
