import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

const SUPPORTED_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'm4a',
  'mp4',
  'webm',
  'ogg',
])

const SUPPORTED_MIME_TYPES = new Set([
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

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

export function validateAudioFile(file: File): void {
  const extension = getFileExtension(file.name)
  const mimeOk =
    file.type === '' ||
    SUPPORTED_MIME_TYPES.has(file.type) ||
    SUPPORTED_EXTENSIONS.has(extension)

  if (!mimeOk && !SUPPORTED_EXTENSIONS.has(extension)) {
    throw errors.unsupportedType()
  }

  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    throw errors.fileTooLarge(env.MAX_FILE_SIZE_MB)
  }
}

export function validateBatchSize(count: number, maxFiles: number): void {
  if (count > maxFiles) {
    throw errors.fileLimitReached()
  }
}
