import { env } from '#/lib/env'

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Magic link email is not configured')
    }

    console.info(`Magic link for ${email}: ${url}`)
    return
  }

  if (!env.RESEND_FROM) {
    throw new Error('RESEND_FROM is required when RESEND_API_KEY is set')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [email],
      subject: 'Seu link de acesso ao Echo',
      text: `Acesse o Echo pelo link abaixo. Ele expira em 15 minutos.\n\n${url}`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('Resend request failed:', response.status, detail)
    throw new Error('Failed to send magic link email')
  }
}
