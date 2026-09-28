const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com'])

const MEDIA_PATH_RE = /^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)\/?$/

export type ParsedInstagramUrl = {
  normalizedUrl: string
  shortcode: string
  kind: 'reel' | 'reels' | 'p' | 'tv'
}

export function parseInstagramUrl(raw: string): ParsedInstagramUrl | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (!INSTAGRAM_HOSTS.has(host)) return null

  const match = MEDIA_PATH_RE.exec(url.pathname)
  if (!match) return null

  const kind = match[1] as ParsedInstagramUrl['kind']
  const shortcode = match[2]

  return {
    normalizedUrl: `https://www.instagram.com/${kind}/${shortcode}/`,
    shortcode,
    kind,
  }
}

export function isValidInstagramMediaUrl(raw: string): boolean {
  return parseInstagramUrl(raw) !== null
}

export const INSTAGRAM_URL_HINT =
  'Cole um link público de Reel ou post do Instagram (ex.: instagram.com/reel/…).'
