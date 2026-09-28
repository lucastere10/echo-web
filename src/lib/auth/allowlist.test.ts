import { describe, expect, it } from 'vitest'

import { isAdminEmailFor, isEmailAllowedFor, parseAllowedEmails } from '#/lib/auth/allowlist'

describe('allowlist', () => {
  it('parses commas, spaces and case', () => {
    expect(parseAllowedEmails(' Ana@Exemplo.com, bob@exemplo.com ,, ')).toEqual(
      new Set(['ana@exemplo.com', 'bob@exemplo.com']),
    )
    expect(parseAllowedEmails(undefined).size).toBe(0)
    expect(parseAllowedEmails('').size).toBe(0)
  })

  it('allows the admin even when the list is empty', () => {
    expect(isEmailAllowedFor('Admin@Exemplo.com', 'admin@exemplo.com', '')).toBe(true)
    expect(isAdminEmailFor(' Admin@Exemplo.com ', 'admin@exemplo.com')).toBe(true)
  })

  it('allows listed emails and rejects everyone else', () => {
    const allowed = 'colega@exemplo.com, outro@exemplo.com'
    expect(isEmailAllowedFor(' Colega@Exemplo.com ', 'admin@exemplo.com', allowed)).toBe(
      true,
    )
    expect(isAdminEmailFor('colega@exemplo.com', 'admin@exemplo.com')).toBe(false)
    expect(isEmailAllowedFor('fora@exemplo.com', 'admin@exemplo.com', allowed)).toBe(
      false,
    )
  })
})
