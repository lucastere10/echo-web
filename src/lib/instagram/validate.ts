import { env } from '#/lib/env'
import { errors } from '#/lib/errors'
import type { InstagramProbe } from '#/lib/instagram/ytdlp'

export type InstagramValidateResult = {
  ok: true
  title?: string
  durationSeconds?: number
  approxSizeMb?: number
  shortcode?: string
  fileName: string
}

export function assertProbeWithinLimits(probe: InstagramProbe): InstagramValidateResult {
  if (!probe.hasVideo && !probe.hasAudio) {
    throw errors.instagramNoMedia()
  }

  if (
    typeof probe.durationSeconds === 'number' &&
    probe.durationSeconds > env.MAX_INSTAGRAM_DURATION_SECONDS
  ) {
    throw errors.instagramTooLong(env.MAX_INSTAGRAM_DURATION_SECONDS)
  }

  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024
  if (
    typeof probe.approxSizeBytes === 'number' &&
    probe.approxSizeBytes > maxBytes
  ) {
    throw errors.fileTooLarge(env.MAX_FILE_SIZE_MB)
  }

  const shortcode = probe.shortcode ?? 'reel'
  const approxSizeMb =
    typeof probe.approxSizeBytes === 'number'
      ? Math.round((probe.approxSizeBytes / (1024 * 1024)) * 10) / 10
      : undefined

  return {
    ok: true,
    title: probe.title,
    durationSeconds: probe.durationSeconds,
    approxSizeMb,
    shortcode,
    fileName: `instagram-${shortcode}.mp4`,
  }
}
