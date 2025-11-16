# Minimal Dockerfile for Render (but render.yaml is preferred)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app files
COPY server.js ./
COPY public ./public

# Create directories for persistent disks (mounted by Render)
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]

