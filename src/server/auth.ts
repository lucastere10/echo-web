import { createServerFn } from '@tanstack/react-start'
import {
  clearSession,
  getSession,
  useSession,
} from '@tanstack/react-start/server'

import { assertAdmin, resolveInviteToken } from '#/lib/auth/access'
import type { SessionData } from '#/lib/auth/session'
import { getActiveSession } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { env } from '#/lib/env'
import { AppError } from '#/lib/errors'
import {
  createInvitation,
  getInvitationStatus,
  listInvitations,
  revokeInvitation,
} from '#/lib/storage/invitations'
import { saveAccessRequest } from '#/lib/storage/access-requests'

export const getAppSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionData | null> => {
    const session = await getSession<SessionData>(sessionConfig)
    return getActiveSession(session.data)
  },
)

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await clearSession(sessionConfig)
  return { success: true }
})

export const acceptInvite = createServerFn({ method: 'GET' })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    try {
      await resolveInviteToken(token)
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.userMessage
          : 'Este convite não é válido.'
      return { ok: false as const, error: message }
    }

    const session = await useSession<SessionData>(sessionConfig)
    await session.update({
      isAdmin: false,
      inviteToken: token,
    })

    return { ok: true as const }
  })

export const requestAccess = createServerFn({ method: 'POST' })
  .validator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Informe um e-mail válido.')
    }

    await saveAccessRequest(email)
    return { success: true }
  })

async function requireAdminSession(): Promise<SessionData> {
  const session = await getSession<SessionData>(sessionConfig)
  return assertAdmin(getActiveSession(session.data))
}

export const listInvitesAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdminSession()
    const invitations = await listInvitations()
    return invitations.map((invitation) => ({
      ...invitation,
      status: getInvitationStatus(invitation),
      url: `${env.APP_URL}/invite/${invitation.token}`,
    }))
  },
)

export const createInviteAdmin = createServerFn({ method: 'POST' })
  .validator((data: { maxUploads: number; maxFilesPerUpload: number }) => data)
  .handler(async ({ data }) => {
    await requireAdminSession()

    const invitation = await createInvitation(data)
    return {
      ...invitation,
      url: `${env.APP_URL}/invite/${invitation.token}`,
    }
  })

export const revokeInviteAdmin = createServerFn({ method: 'POST' })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    await requireAdminSession()
    await revokeInvitation(token)
    return { success: true }
  })
