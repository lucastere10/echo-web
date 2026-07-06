import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

type Entry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Entry>()

export function checkIpRateLimit(ip: string): void {
  const now = Date.now()
  const windowMs = 60_000
  const limit = env.RATE_LIMIT_PER_MINUTE

  const existing = buckets.get(ip)
  if (!existing || existing.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs })
    return
  }

  if (existing.count >= limit) {
    throw errors.rateLimited()
  }

  existing.count += 1
}
