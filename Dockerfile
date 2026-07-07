# syntax=docker/dockerfile:1

# Install deps with Bun (fast, lockfile-compatible).
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build with Node so Nitro/srvx bundles the Node server adapter (not Bun.serve).
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder /app/.output ./

RUN mkdir -p /app/data \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

CMD ["node", "server/index.mjs"]
