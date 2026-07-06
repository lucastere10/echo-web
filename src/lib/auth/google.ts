import { Google } from 'arctic'

import { env } from '#/lib/env'

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.APP_URL}/auth/callback`,
)

export const googleScopes = ['openid', 'profile', 'email']

export type GoogleUser = {
  email: string
  name?: string
  picture?: string
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile')
  }

  const data = (await response.json()) as {
    email?: string
    name?: string
    picture?: string
  }

  if (!data.email) {
    throw new Error('Google account has no email address')
  }

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  }
}
