#!/bin/bash
set -e

echo "🦞 OpenClaw Gateway — Démarrage Cloud (Optimisé)..."

# Dossier de config défini dans le Dockerfile
CREDS_DIR="$OPENCLAW_HOME/credentials"
mkdir -p "$CREDS_DIR"

# DeepSeek
if [ -n "$DEEPSEEK_API_KEY" ]; then
  echo "🔑 Injection clé DeepSeek..."
  cat > "$CREDS_DIR/deepseek:default.json" <<EOF
{
  "provider": "deepseek",
  "profileId": "deepseek:default",
  "mode": "token",
  "token": "$DEEPSEEK_API_KEY"
}
EOF
fi

# Kimi (Moonshot)
if [ -n "$KIMI_API_KEY" ]; then
  echo "🔑 Injection clé Kimi..."
  cat > "$CREDS_DIR/kimi:default.json" <<EOF
{
  "provider": "kimi",
  "profileId": "kimi:default",
  "mode": "token",
  "token": "$KIMI_API_KEY"
}
EOF
fi

# WhatsApp
if [ -n "$WHATSAPP_SESSION" ]; then
  echo "📱 Injection session WhatsApp..."
  mkdir -p "$OPENCLAW_HOME/channels/whatsapp"
  echo "$WHATSAPP_SESSION" | base64 -d > "$OPENCLAW_HOME/channels/whatsapp/session.json"
fi

echo "🚀 Lancement du Gateway..."
# On utilise --config pour être sûr qu'il lit le bon fichier
exec openclaw gateway --config "$OPENCLAW_HOME/openclaw.json"
