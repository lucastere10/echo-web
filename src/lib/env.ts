function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string): string {
  return process.env[name]?.trim() ?? ''
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${raw}`)
  }
  return parsed
}

export const env = Object.freeze({
  ADMIN_EMAIL: required('ADMIN_EMAIL').trim().toLowerCase(),
  ALLOWED_EMAILS: optional('ALLOWED_EMAILS'),
  RESEND_API_KEY: optional('RESEND_API_KEY'),
  RESEND_FROM: optional('RESEND_FROM'),
  OPENAI_API_KEY: required('OPENAI_API_KEY'),
  SESSION_SECRET: required('SESSION_SECRET'),
  APP_URL: required('APP_URL').replace(/\/$/, ''),
  MAX_FILES_PER_UPLOAD: optionalInt('MAX_FILES_PER_UPLOAD', 10),
  INVITE_EXPIRATION_HOURS: optionalInt('INVITE_EXPIRATION_HOURS', 24),
  MAX_FILE_SIZE_MB: optionalInt('MAX_FILE_SIZE_MB', 150),
  MAX_INSTAGRAM_DURATION_SECONDS: optionalInt('MAX_INSTAGRAM_DURATION_SECONDS', 180),
  MAX_CONCURRENT_JOBS: optionalInt('MAX_CONCURRENT_JOBS', 2),
  RATE_LIMIT_PER_MINUTE: optionalInt('RATE_LIMIT_PER_MINUTE', 30),
})

export const envClient = Object.freeze({
  MAX_FILES_PER_UPLOAD: env.MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_MB: env.MAX_FILE_SIZE_MB,
  MAX_INSTAGRAM_DURATION_SECONDS: env.MAX_INSTAGRAM_DURATION_SECONDS,
})
