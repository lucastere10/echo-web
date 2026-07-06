export type SessionData = {
  email?: string
  name?: string
  picture?: string
  isAdmin: boolean
  inviteToken?: string
}

export const OAUTH_STATE_COOKIE = 'echo_oauth_state'
export const OAUTH_VERIFIER_COOKIE = 'echo_oauth_verifier'
export const FLASH_ERROR_COOKIE = 'echo_flash_error'

export function getActiveSession(
  data: Partial<SessionData> | null | undefined,
): SessionData | null {
  if (!data) return null
  if (data.isAdmin && data.email) {
    return data as SessionData
  }
  if (data.inviteToken) {
    return data as SessionData
  }
  return null
}

export function getSessionLabel(session: SessionData | null): string | undefined {
  if (!session) return undefined
  if (session.email) return session.email
  if (session.inviteToken) return 'Convidado'
  return undefined
}

export function canUpload(session: SessionData | null): boolean {
  if (!session) return false
  if (session.isAdmin) return true
  return Boolean(session.inviteToken)
}

export function canAccessAdmin(session: SessionData | null): boolean {
  return Boolean(session?.isAdmin)
}
