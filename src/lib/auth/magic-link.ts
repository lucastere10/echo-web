import { createHmac, timingSafeEqual } from 'node:crypto'

import { normalizeEmail } from '#/lib/auth/allowlist'
import { env } from '#/lib/env'

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

type MagicLinkPayload = {
  email: string
  exp: number
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createMagicLinkToken(
  email: string,
  secret: string,
  now = Date.now(),
): string {
  const body = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: now + MAGIC_LINK_TTL_MS,
    } satisfies MagicLinkPayload),
    'utf8',
  ).toString('base64url')

  return `${body}.${signPayload(body, secret)}`
}

export function readMagicLinkToken(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const body = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!body || !signature) return null

  const expected = signPayload(body, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as Partial<MagicLinkPayload>

    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
      return null
    }
    if (payload.exp <= now) return null

    return normalizeEmail(payload.email)
  } catch {
    return null
  }
}

export function signMagicLink(email: string): string {
  return createMagicLinkToken(email, env.SESSION_SECRET)
}

export function verifyMagicLink(token: string): string | null {
  return readMagicLinkToken(token, env.SESSION_SECRET)
}
