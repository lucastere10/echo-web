import { createFileRoute } from '@tanstack/react-router'
import { getRequestIP, getSession } from '@tanstack/react-start/server'

import { assertUploadAccess } from '#/lib/auth/access'
import type { SessionData } from '#/lib/auth/session'
import { getActiveSession } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { validateAudioFile } from '#/lib/audio'
import { prepareAudioForTranscription } from '#/lib/audio/prepare'
import { toErrorResponse } from '#/lib/errors'
import { env } from '#/lib/env'
import { transcribeAudioParts } from '#/lib/openai/transcribe'
import { withJobSlot } from '#/lib/rate-limit/jobs'
import { checkIpRateLimit } from '#/lib/rate-limit/ip'
import { incrementUploadsUsed } from '#/lib/storage/invitations'

export const Route = createFileRoute('/api/transcribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
          checkIpRateLimit(ip)

          const sessionState = await getSession<SessionData>(sessionConfig)
          const session = getActiveSession(sessionState.data)
          const access = await assertUploadAccess(session)

          const formData = await request.formData()
          const file = formData.get('file')
          const batchSize = Number(formData.get('batchSize') ?? '1')

          if (!(file instanceof File)) {
            return Response.json({ error: 'No file provided.' }, { status: 400 })
          }

          if (batchSize > Math.min(access.maxFilesPerUpload, env.MAX_FILES_PER_UPLOAD)) {
            return Response.json(
              { error: 'Too many files in this upload batch.' },
              { status: 429 },
            )
          }

          validateAudioFile(file)

          if (!session?.isAdmin && access.inviteToken) {
            await incrementUploadsUsed(access.inviteToken)
          }

          const text = await withJobSlot(async () => {
            const parts = await prepareAudioForTranscription(file)
            return transcribeAudioParts(parts)
          })

          return Response.json({
            text,
            fileName: file.name,
          })
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
