FROM node:22

WORKDIR /app

# Install dependencies
COPY backend/package.json ./backend/
RUN cd backend && npm install --production

# Copy all application files
COPY . .

# Remove local DB files (will be created fresh)
RUN rm -f backend/colisconnect.sqlite backend/colisconnect.sqlite-wal backend/colisconnect.sqlite-shm backend/seed.sqlite backend/deploy.sqlite backend/colis_connect.db

# Set environment variables
ENV PORT=7860
ENV HOST=0.0.0.0

EXPOSE 7860

# Seed the DB then start the server
CMD node /app/create_seed_db.js && mv /app/backend/seed.sqlite /app/backend/colisconnect.sqlite && node backend/server.js
