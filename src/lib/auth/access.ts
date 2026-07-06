import {
  getInvitationByToken,
  isInvitationValid,
} from '#/lib/storage/invitations'
import type { SessionData } from '#/lib/auth/session'
import { errors } from '#/lib/errors'

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

  if (session.isAdmin) {
    return { session, maxFilesPerUpload: Number.MAX_SAFE_INTEGER }
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
