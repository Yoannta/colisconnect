FROM node:22

WORKDIR /app

# Copy backend package.json and install dependencies
COPY backend/package.json ./backend/
RUN cd backend && npm install

# Copy the rest of the application
COPY . .

# Set environment variables for HF
ENV PORT=7860
ENV HOST=0.0.0.0

EXPOSE 7860

# Run the backend server
CMD ["node", "backend/server.js"]
