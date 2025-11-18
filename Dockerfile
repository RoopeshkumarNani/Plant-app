# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --production --audit-level=moderate && \
    npm cache clean --force && \
    npm audit fix --audit-level=moderate || true

# Runtime stage - distroless for minimal attack surface
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy app files
COPY server.js ./
COPY public ./public

# Create app data directories
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 8080

# Start server
CMD ["server.js"]

