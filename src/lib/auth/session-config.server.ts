import { env } from '#/lib/env'

export const sessionConfig = {
  password: env.SESSION_SECRET,
  name: 'echo_session',
  maxAge: 60 * 60 * 24 * 7,
  cookie: {
    httpOnly: true,
    secure: env.APP_URL.startsWith('https'),
    sameSite: 'lax' as const,
    path: '/',
  },
}
