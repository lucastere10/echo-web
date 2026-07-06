import { createServerFn } from '@tanstack/react-start'
import { getSession } from '@tanstack/react-start/server'

import { canUpload, getActiveSession } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import type { SessionData } from '#/lib/auth/session'
import { env } from '#/lib/env'
import { getInvitationByToken } from '#/lib/storage/invitations'

export const getUploadConfig = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession<SessionData>(sessionConfig)
    const data = getActiveSession(session.data)

    if (!canUpload(data)) {
      return {
        canUpload: false,
        maxFilesPerUpload: env.MAX_FILES_PER_UPLOAD,
        maxFileSizeMb: env.MAX_FILE_SIZE_MB,
      }
    }

    if (data?.isAdmin) {
      return {
        canUpload: true,
        maxFilesPerUpload: env.MAX_FILES_PER_UPLOAD,
        maxFileSizeMb: env.MAX_FILE_SIZE_MB,
        isAdmin: true,
      }
    }

    const invitation = data?.inviteToken
      ? await getInvitationByToken(data.inviteToken)
      : null

    return {
      canUpload: true,
      maxFilesPerUpload: Math.min(
        invitation?.maxFilesPerUpload ?? env.MAX_FILES_PER_UPLOAD,
        env.MAX_FILES_PER_UPLOAD,
      ),
      maxFileSizeMb: env.MAX_FILE_SIZE_MB,
      isAdmin: false,
    }
  },
)
