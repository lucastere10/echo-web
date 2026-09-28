import { isAdminEmail, isEmailAllowed } from '#/lib/auth/allowlist'
import type { SessionData } from '#/lib/auth/session'
import { getActiveSession } from '#/lib/auth/session'
import { env } from '#/lib/env'
import { errors } from '#/lib/errors'
import {
  getInvitationByToken,
  isInvitationValid,
} from '#/lib/storage/invitations'

export function resolveSession(
  data: Partial<SessionData> | null | undefined,
): SessionData | null {
  const session = getActiveSession(data)
  if (!session?.email) {
    return session?.inviteToken ? session : null
  }

  if (!isEmailAllowed(session.email)) return null

  return {
    email: session.email,
    name: session.name,
    picture: session.picture,
    isAdmin: isAdminEmail(session.email),
  }
}

export async function resolveInviteToken(
  inviteToken: string | undefined,
): Promise<string | undefined> {
  if (!inviteToken) return undefined

  const invitation = await getInvitationByToken(inviteToken)
  if (!invitation) {
    throw errors.forbidden('Link de convite inválido.')
  }
  if (invitation.revoked) {
    throw errors.inviteRevoked()
  }
  if (!isInvitationValid(invitation)) {
    if (invitation.uploadsUsed >= invitation.maxUploads) {
      throw errors.uploadLimitReached()
    }
    throw errors.inviteExpired()
  }

  return inviteToken
}

export async function assertUploadAccess(session: SessionData | null): Promise<{
  session: SessionData
  inviteToken?: string
  maxFilesPerUpload: number
}> {
  if (!session) {
    throw errors.unauthorized()
  }

  if (session.email) {
    if (!isEmailAllowed(session.email)) {
      throw errors.unauthorized()
    }

    const refreshed: SessionData = {
      email: session.email,
      name: session.name,
      picture: session.picture,
      isAdmin: isAdminEmail(session.email),
    }

    return {
      session: refreshed,
      maxFilesPerUpload: refreshed.isAdmin
        ? Number.MAX_SAFE_INTEGER
        : env.MAX_FILES_PER_UPLOAD,
    }
  }

  if (!session.inviteToken) {
    throw errors.forbidden(
      'Você precisa de um link de convite válido para enviar áudio.',
    )
  }

  const invitation = await getInvitationByToken(session.inviteToken)
  if (!invitation) {
    throw errors.forbidden('Convite inválido.')
  }
  if (invitation.revoked) {
    throw errors.inviteRevoked()
  }
  if (!isInvitationValid(invitation)) {
    if (invitation.uploadsUsed >= invitation.maxUploads) {
      throw errors.uploadLimitReached()
    }
    throw errors.inviteExpired()
  }

  return {
    session,
    inviteToken: session.inviteToken,
    maxFilesPerUpload: invitation.maxFilesPerUpload,
  }
}

export function assertAdmin(session: SessionData | null): SessionData {
  if (!session?.isAdmin) {
    throw errors.forbidden('Acesso de administrador necessário.')
  }
  return session
}
