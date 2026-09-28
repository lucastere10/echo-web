import { env } from '#/lib/env'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set()

  return new Set(
    raw
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0),
  )
}

export function isEmailAllowedFor(
  email: string,
  adminEmail: string,
  allowedRaw: string | undefined,
): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  if (normalized === normalizeEmail(adminEmail)) return true
  return parseAllowedEmails(allowedRaw).has(normalized)
}

export function isAdminEmailFor(email: string, adminEmail: string): boolean {
  const normalized = normalizeEmail(email)
  return normalized.length > 0 && normalized === normalizeEmail(adminEmail)
}

export function isEmailAllowed(email: string): boolean {
  return isEmailAllowedFor(email, env.ADMIN_EMAIL, env.ALLOWED_EMAILS)
}

export function isAdminEmail(email: string): boolean {
  return isAdminEmailFor(email, env.ADMIN_EMAIL)
}
