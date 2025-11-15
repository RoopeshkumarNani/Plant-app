# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app files
COPY server.js ./
COPY public ./public
COPY data ./data

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
