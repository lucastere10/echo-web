import { createWriteStream } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

import { errors } from '#/lib/errors'
import { getFileExtension, isVideoFile } from '#/lib/media'

import { assertFfmpegAvailable, getMediaDurationSeconds, runFfmpeg } from './ffmpeg'

export const WHISPER_MAX_BYTES = 24 * 1024 * 1024
const MP3_BITRATE = '64k'
const MP3_BITRATE_BPS = 64_000

export type PreparedAudioPart = {
  buffer: Buffer
  fileName: string
}

async function writeUploadToTemp(file: File, dir: string): Promise<string> {
  const extension = getFileExtension(file.name) || 'bin'
  const inputPath = join(dir, `input.${extension}`)
  await pipeline(
    Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(inputPath),
  )
  return inputPath
}

async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    MP3_BITRATE,
    outputPath,
  ])
}

function estimateSegmentSeconds(fileSizeBytes: number, durationSeconds?: number): number {
  if (durationSeconds && durationSeconds > 0) {
    const secondsPerByte = durationSeconds / fileSizeBytes
    return Math.max(60, Math.floor(WHISPER_MAX_BYTES * secondsPerByte * 0.9))
  }

  const bytesPerSecond = MP3_BITRATE_BPS / 8
  return Math.max(60, Math.floor((WHISPER_MAX_BYTES / bytesPerSecond) * 0.9))
}

async function segmentMp3(
  inputPath: string,
  outputPattern: string,
  segmentSeconds: number,
): Promise<string[]> {
  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
    '-f',
    'segment',
    '-segment_time',
    String(segmentSeconds),
    '-c',
    'copy',
    outputPattern,
  ])

  const dir = dirname(outputPattern)
  const files = (await readdir(dir))
    .filter((name) => name.startsWith('part-') && name.endsWith('.mp3'))
    .sort()
    .map((name) => join(dir, name))

  return files
}

async function readParts(paths: string[], baseName: string): Promise<PreparedAudioPart[]> {
  const parts: PreparedAudioPart[] = []
  for (const [index, partPath] of paths.entries()) {
    const buffer = await readFile(partPath)
    parts.push({
      buffer,
      fileName: `${baseName}.part${String(index + 1).padStart(3, '0')}.mp3`,
    })
  }
  return parts
}

function needsPreparation(file: File): boolean {
  return isVideoFile(file.name, file.type) || file.size > WHISPER_MAX_BYTES
}

export async function prepareAudioForTranscription(
  file: File,
): Promise<PreparedAudioPart[]> {
  if (!needsPreparation(file)) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return [{ buffer, fileName: file.name }]
  }

  try {
    await assertFfmpegAvailable()
  } catch {
    throw errors.audioPrepareUnavailable()
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'echo-transcribe-'))
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'audio'

  try {
    const inputPath = await writeUploadToTemp(file, tempDir)
    const mp3Path = join(tempDir, 'prepared.mp3')

    try {
      await convertToMp3(inputPath, mp3Path)
    } catch {
      throw errors.audioPrepareFailed()
    }

    const mp3Buffer = await readFile(mp3Path)
    if (mp3Buffer.length === 0) {
      throw errors.audioPrepareFailed()
    }

    if (mp3Buffer.length <= WHISPER_MAX_BYTES) {
      return [{ buffer: mp3Buffer, fileName: `${baseName}.mp3` }]
    }

    const duration = await getMediaDurationSeconds(mp3Path)
    const segmentSeconds = estimateSegmentSeconds(mp3Buffer.length, duration)
    const segmentPattern = join(tempDir, 'part-%03d.mp3')
    const segmentPaths = await segmentMp3(mp3Path, segmentPattern, segmentSeconds)

    if (segmentPaths.length === 0) {
      throw errors.audioPrepareFailed()
    }

    return readParts(segmentPaths, baseName)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
