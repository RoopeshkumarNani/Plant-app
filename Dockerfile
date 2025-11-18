# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --production --audit-level=moderate && \
    npm cache clean --force && \
    npm audit fix --audit-level=moderate || true

# Create app directories in builder
RUN mkdir -p /app/data /app/uploads

# Runtime stage - distroless for minimal attack surface
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/data ./data
COPY --from=builder /app/uploads ./uploads

# Copy app files
COPY server.js ./
COPY public ./public

# Expose port
EXPOSE 8080

# Start server
CMD ["server.js"]

