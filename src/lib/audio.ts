import { env } from '#/lib/env'
import { errors } from '#/lib/errors'
import {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  getFileExtension,
} from '#/lib/media'

export {
  FILE_ACCEPT,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_FORMATS_LABEL,
  SUPPORTED_MIME_TYPES,
  VIDEO_EXTENSIONS,
  getFileExtension,
  isSupportedMediaFile,
  isVideoFile,
} from '#/lib/media'

export function validateAudioFile(file: File): void {
  const extension = getFileExtension(file.name)
  const mimeOk =
    file.type === '' ||
    SUPPORTED_MIME_TYPES.has(file.type) ||
    SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])

  if (
    !mimeOk &&
    !SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])
  ) {
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
