# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

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
