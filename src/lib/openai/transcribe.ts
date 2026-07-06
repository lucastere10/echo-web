import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

export async function transcribeAudio(
  file: Blob,
  fileName: string,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, fileName)
  formData.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('OpenAI transcription failed:', response.status, body)
    throw errors.openAiFailed()
  }

  const data = (await response.json()) as { text?: string }
  if (!data.text) {
    throw errors.openAiFailed()
  }

  return data.text
}
