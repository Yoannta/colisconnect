FROM node:20

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    curl git postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install paperclip and attempt codex install
RUN npm install -g paperclipai@latest

# Prepare paperclip home
ENV PAPERCLIP_HOME=/app/paperclip_home
RUN mkdir -p $PAPERCLIP_HOME

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# HF Spaces port
EXPOSE 7860

CMD ["/app/start.sh"]
