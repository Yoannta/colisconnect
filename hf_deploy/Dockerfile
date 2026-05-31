FROM node:22

ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN apt-get update && apt-get install -y ca-certificates curl ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install openclaw@latest @openclaw/whatsapp --no-audit --no-fund
RUN mkdir -p /root/.openclaw/npm && \
    npm install --prefix /root/.openclaw/npm @openclaw/whatsapp --no-audit --no-fund

COPY openclaw.json /root/.openclaw/openclaw.json
COPY workspace/ /root/.openclaw/workspace/
COPY setup.js /app/setup.js

EXPOSE 7860

# CMD : On lance le viewer de logs ET l'agent dont on redirige les sorties vers le fichier de log
CMD ["sh", "-c", "\
    node setup.js & \
    if [ -n \"$DEEPSEEK_API_KEY\" ]; then mkdir -p /root/.openclaw/credentials && printf '{\"provider\":\"deepseek\",\"profileId\":\"deepseek:default\",\"mode\":\"token\",\"token\":\"%s\"}' \"$DEEPSEEK_API_KEY\" > /root/.openclaw/credentials/deepseek:default.json ; fi && \
    if [ -n \"$KIMI_API_KEY\" ]; then printf '{\"provider\":\"kimi\",\"profileId\":\"kimi:default\",\"mode\":\"token\",\"token\":\"%s\"}' \"$KIMI_API_KEY\" > /root/.openclaw/credentials/kimi:default.json ; fi && \
    sleep 2 && \
    OPENCLAW_WHATSAPP_LINK_MODE=code \
    OPENCLAW_WHATSAPP_PHONE_NUMBER=22553701003 \
    node node_modules/openclaw/openclaw.mjs gateway | tee /tmp/openclaw.log \
    "]
