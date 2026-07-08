export const SUPPORTED_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'mp4',
  'webm',
  'ogg',
] as const

export const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'video/mp4',
  'audio/webm',
  'video/webm',
  'audio/ogg',
  'application/ogg',
])

export const VIDEO_EXTENSIONS = new Set(['mp4', 'webm'])

export const SUPPORTED_FORMATS_LABEL = 'mp3, wav, m4a, mp4, webm ou ogg'

export const FILE_ACCEPT =
  '.mp3,.wav,.m4a,.mp4,.webm,.ogg,audio/*,video/mp4,video/webm'

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

export function isVideoFile(fileName: string, mimeType = ''): boolean {
  if (mimeType.startsWith('video/')) return true
  return VIDEO_EXTENSIONS.has(getFileExtension(fileName))
}

export function isSupportedMediaFile(fileName: string, mimeType = ''): boolean {
  const extension = getFileExtension(fileName)
  const mimeOk =
    mimeType === '' ||
    SUPPORTED_MIME_TYPES.has(mimeType) ||
    SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])

  return (
    mimeOk ||
    SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])
  )
}
