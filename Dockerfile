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
RUN apk add --no-cache bash git
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

ENV TERM=xterm-256color

ENTRYPOINT ["node", "dist/cli.js"]
CMD []
