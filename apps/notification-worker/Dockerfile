# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build notification-worker

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy node_modules and built assets from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Start the application
CMD ["node", "dist/apps/notification-worker/main.js"]
