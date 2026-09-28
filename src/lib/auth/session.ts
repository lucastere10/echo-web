export type SessionData = {
  email?: string
  name?: string
  picture?: string
  isAdmin: boolean
  inviteToken?: string
}

export function getActiveSession(
  data: Partial<SessionData> | null | undefined,
): SessionData | null {
  if (!data) return null
  if (data.email) {
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
  if (session.isAdmin || session.email) return true
  return Boolean(session.inviteToken)
}

export function canAccessAdmin(session: SessionData | null): boolean {
  return Boolean(session?.isAdmin)
}
