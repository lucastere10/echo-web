import { createServerFn } from '@tanstack/react-start'
import {
  clearSession,
  getRequestIP,
  getSession,
  updateSession,
} from '@tanstack/react-start/server'

import { assertAdmin, resolveInviteToken, resolveSession } from '#/lib/auth/access'
import { isEmailAllowed } from '#/lib/auth/allowlist'
import { signMagicLink } from '#/lib/auth/magic-link'
import { sendMagicLinkEmail } from '#/lib/auth/send-magic-link'
import type { SessionData } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { env } from '#/lib/env'
import { AppError } from '#/lib/errors'
import {
  createInvitation,
  getInvitationStatus,
  listInvitations,
  revokeInvitation,
} from '#/lib/storage/invitations'
import { checkIpRateLimit } from '#/lib/rate-limit/ip'
import { saveAccessRequest } from '#/lib/storage/access-requests'

function isValidEmail(email: string): boolean {
  const at = email.indexOf('@')
  if (at <= 0 || email.lastIndexOf('@') !== at || email.includes(' ')) return false
  const domain = email.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  return dot > 0 && dot < domain.length - 1
}

export const getAppSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionData | null> => {
    const session = await getSession<SessionData>(sessionConfig)
    return resolveSession(session.data)
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

    await clearSession(sessionConfig)
    await updateSession(sessionConfig, {
      isAdmin: false,
      inviteToken: token,
    })

    return { ok: true as const }
  })

export const requestAccess = createServerFn({ method: 'POST' })
  .validator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }) => {
    if (!isValidEmail(email)) {
      throw new Error('Informe um e-mail válido.')
    }

    await saveAccessRequest(email)
    return { success: true }
  })

export const requestMagicLink = createServerFn({ method: 'POST' })
  .validator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }) => {
    if (!isValidEmail(email)) {
      throw new Error('Informe um e-mail válido.')
    }

    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    checkIpRateLimit(ip)

    if (!isEmailAllowed(email)) {
      return { success: true as const }
    }

    const token = signMagicLink(email)
    const url = `${env.APP_URL}/auth/magic?token=${encodeURIComponent(token)}`

    try {
      await sendMagicLinkEmail(email, url)
    } catch (error) {
      console.error('Magic link send failed:', error)
      throw new Error('Não foi possível enviar o link. Tente novamente.')
    }

    return { success: true as const }
  })

async function requireAdminSession(): Promise<SessionData> {
  const session = await getSession<SessionData>(sessionConfig)
  return assertAdmin(resolveSession(session.data))
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
