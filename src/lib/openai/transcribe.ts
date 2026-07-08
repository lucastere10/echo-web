import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

import type { PreparedAudioPart } from '#/lib/audio/prepare'

const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe'
const PROMPT_TAIL_CHARS = 500

async function transcribePart(
  file: Blob,
  fileName: string,
  prompt?: string,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, fileName)
  formData.append('model', TRANSCRIPTION_MODEL)
  if (prompt) {
    formData.append('prompt', prompt)
  }

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

export async function transcribeAudio(
  file: Blob,
  fileName: string,
): Promise<string> {
  return transcribePart(file, fileName)
}

export async function transcribeAudioParts(
  parts: PreparedAudioPart[],
): Promise<string> {
  if (parts.length === 0) {
    throw errors.audioPrepareFailed()
  }

  const transcripts: string[] = []
  let prompt: string | undefined

  for (const part of parts) {
    const blob = new Blob([part.buffer], { type: 'audio/mpeg' })
    const text = await transcribePart(blob, part.fileName, prompt)
    transcripts.push(text.trim())
    prompt = text.trim().slice(-PROMPT_TAIL_CHARS)
  }

  return transcripts.join('\n\n')
}
