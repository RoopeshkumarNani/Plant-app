# Simple Node.js Alpine image with security best practices
FROM node:22-alpine

WORKDIR /app

# Create app directories first
RUN mkdir -p /app/data /app/uploads

# Copy package files
COPY package*.json ./

# Install dependencies with security updates
RUN npm install --production && \
    npm cache clean --force && \
    npm audit fix || true

# Copy app files
COPY server.js ./
COPY public ./public

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]

