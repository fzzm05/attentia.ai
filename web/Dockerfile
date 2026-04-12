# --- Stage 1: Install Dependencies ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Stage 2: Build Application ---
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build time
ENV NEXT_TELEMETRY_DISABLED=1
# Replace with the actual URL where the backend is expected to be reachable
ENV NEXT_PUBLIC_SESSION_ENGINE_WS_URL=ws://localhost:8000/ws

RUN npm run build

# --- Stage 3: Runtime ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
