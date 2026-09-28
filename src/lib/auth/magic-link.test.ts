import { describe, expect, it } from 'vitest'

import {
  MAGIC_LINK_TTL_MS,
  createMagicLinkToken,
  readMagicLinkToken,
} from '#/lib/auth/magic-link'

const secret = 'test-session-secret'

describe('magic link token', () => {
  it('round-trips a valid token', () => {
    const now = 1_700_000_000_000
    const token = createMagicLinkToken('Admin@Exemplo.com', secret, now)
    expect(readMagicLinkToken(token, secret, now + 1000)).toBe('admin@exemplo.com')
  })

  it('rejects an expired token', () => {
    const now = 1_700_000_000_000
    const token = createMagicLinkToken('admin@exemplo.com', secret, now)
    expect(readMagicLinkToken(token, secret, now + MAGIC_LINK_TTL_MS)).toBe(null)
  })

  it('rejects a tampered token', () => {
    const now = 1_700_000_000_000
    const token = createMagicLinkToken('admin@exemplo.com', secret, now)
    const [body, signature] = token.split('.')
    const tamperedBody = `${body.slice(0, -1)}${body.endsWith('a') ? 'b' : 'a'}`
    expect(readMagicLinkToken(`${tamperedBody}.${signature}`, secret, now)).toBe(null)
    expect(readMagicLinkToken(token, 'other-secret', now)).toBe(null)
    expect(readMagicLinkToken('not-a-token', secret, now)).toBe(null)
  })
})
