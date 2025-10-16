# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./

# Install dependencies, ignoring peer conflicts
RUN npm ci --legacy-peer-deps
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# --- Runtime Stage ---
FROM node:20-alpine AS runtime
RUN apk add --no-cache bash
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built application from the build stage
COPY --from=builder /app/dist ./dist

# Set the container's entrypoint
ENTRYPOINT ["node","dist/cli.js"]
