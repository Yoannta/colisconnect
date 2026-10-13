#!/bin/bash
# Cherche un navigateur Chromium installé (aucune dépendance npm)
for p in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
  "/c/Users/hp/AppData/Local/Google/Chrome/Application/chrome.exe" \
  "/c/Users/hp/AppData/Local/Microsoft/Edge/Application/msedge.exe"
do
  if [ -f "$p" ]; then echo "TROUVE: $p"; fi
done
echo "--- playwright local ?"
ls -d /d/hermes/node_modules/playwright 2>/dev/null || echo "non (D:/hermes/node_modules)"
echo "--- scripts existants"
ls /d/hermes/scripts/*.js
