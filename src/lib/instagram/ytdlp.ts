import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { errors, AppError } from '#/lib/errors'

const execFileAsync = promisify(execFile)

export type InstagramProbe = {
  title?: string
  durationSeconds?: number
  approxSizeBytes?: number
  shortcode?: string
  hasAudio: boolean
  hasVideo: boolean
}

type YtDlpJson = {
  title?: string
  duration?: number
  filesize?: number
  filesize_approx?: number
  id?: string
  shortcode?: string
  vcodec?: string
  acodec?: string
  formats?: Array<{
    vcodec?: string
    acodec?: string
    filesize?: number
    filesize_approx?: number
  }>
}

type YtDlpCommand = {
  file: string
  prefixArgs: string[]
}

let resolvedCommand: YtDlpCommand | null | undefined

function getStderr(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error) {
    return String((error as { stderr?: string | Buffer }).stderr ?? '')
  }
  return ''
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function isMissingBinaryError(error: unknown): boolean {
  const combined = `${getErrorMessage(error)}\n${getStderr(error)}`.toLowerCase()
  return (
    combined.includes('enoent') ||
    combined.includes('spawn') ||
    combined.includes('not recognized') ||
    combined.includes('is not recognized')
  )
}

function mapYtDlpError(error: unknown): never {
  const combined = `${getErrorMessage(error)}\n${getStderr(error)}`.toLowerCase()

  if (isMissingBinaryError(error)) {
    throw errors.instagramYtDlpUnavailable()
  }

  if (
    combined.includes('private') ||
    combined.includes('login required') ||
    combined.includes('only available for registered users') ||
    combined.includes('cookies')
  ) {
    throw errors.instagramPrivateOrUnavailable()
  }

  if (
    combined.includes('not found') ||
    combined.includes('404') ||
    combined.includes('unavailable') ||
    combined.includes('removed') ||
    combined.includes('does not exist')
  ) {
    throw errors.instagramPrivateOrUnavailable()
  }

  throw errors.instagramFetchFailed()
}

const CANDIDATE_COMMANDS: YtDlpCommand[] = [
  { file: 'yt-dlp', prefixArgs: [] },
  { file: 'yt-dlp.exe', prefixArgs: [] },
  { file: 'py', prefixArgs: ['-m', 'yt_dlp'] },
  { file: 'python', prefixArgs: ['-m', 'yt_dlp'] },
  { file: 'python3', prefixArgs: ['-m', 'yt_dlp'] },
]

async function tryCommand(command: YtDlpCommand): Promise<boolean> {
  try {
    await execFileAsync(command.file, [...command.prefixArgs, '--version'])
    return true
  } catch {
    return false
  }
}

async function resolveYtDlpCommand(): Promise<YtDlpCommand> {
  if (resolvedCommand) return resolvedCommand
  if (resolvedCommand === null) {
    throw errors.instagramYtDlpUnavailable()
  }

  for (const candidate of CANDIDATE_COMMANDS) {
    if (await tryCommand(candidate)) {
      resolvedCommand = candidate
      return candidate
    }
  }

  resolvedCommand = null
  throw errors.instagramYtDlpUnavailable()
}

async function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const command = await resolveYtDlpCommand()
  try {
    return await execFileAsync(command.file, [...command.prefixArgs, ...args], {
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    if (isMissingBinaryError(error)) {
      resolvedCommand = undefined
    }
    throw error
  }
}

function pickApproxSize(info: YtDlpJson): number | undefined {
  if (typeof info.filesize === 'number' && info.filesize > 0) return info.filesize
  if (typeof info.filesize_approx === 'number' && info.filesize_approx > 0) {
    return info.filesize_approx
  }

  const formats = info.formats ?? []
  let best: number | undefined
  for (const format of formats) {
    const size = format.filesize ?? format.filesize_approx
    if (typeof size === 'number' && size > 0) {
      if (best === undefined || size > best) best = size
    }
  }
  return best
}

function parseProbe(info: YtDlpJson): InstagramProbe {
  const vcodec = info.vcodec
  const acodec = info.acodec
  const formats = info.formats ?? []

  const hasVideo =
    (typeof vcodec === 'string' && vcodec !== 'none') ||
    formats.some((f) => typeof f.vcodec === 'string' && f.vcodec !== 'none')

  const hasAudio =
    (typeof acodec === 'string' && acodec !== 'none') ||
    formats.some((f) => typeof f.acodec === 'string' && f.acodec !== 'none')

  const duration =
    typeof info.duration === 'number' && Number.isFinite(info.duration)
      ? info.duration
      : undefined

  return {
    title: info.title,
    durationSeconds: duration,
    approxSizeBytes: pickApproxSize(info),
    shortcode: info.shortcode ?? info.id,
    hasAudio,
    hasVideo,
  }
}

export async function probeInstagram(url: string): Promise<InstagramProbe> {
  try {
    const { stdout } = await runYtDlp([
      '--dump-json',
      '--no-download',
      '--no-playlist',
      '--no-warnings',
      url,
    ])
    const info = JSON.parse(stdout) as YtDlpJson
    return parseProbe(info)
  } catch (error) {
    if (error instanceof AppError) throw error
    mapYtDlpError(error)
  }
}

export async function downloadInstagram(
  url: string,
  outDir: string,
): Promise<{ filePath: string; fileName: string }> {
  const outputTemplate = join(outDir, 'instagram.%(ext)s')

  try {
    await runYtDlp([
      '--no-playlist',
      '--no-warnings',
      '-f',
      'bv*+ba/b',
      '--merge-output-format',
      'mp4',
      '-o',
      outputTemplate,
      url,
    ])
  } catch (error) {
    if (error instanceof AppError) throw error
    mapYtDlpError(error)
  }

  const entries = await readdir(outDir)
  const media = entries.find((name) => !name.endsWith('.json') && !name.endsWith('.part'))
  if (!media) {
    throw errors.instagramFetchFailed()
  }

  return {
    filePath: join(outDir, media),
    fileName: media.startsWith('instagram.')
      ? media
      : `instagram.${media.split('.').pop() ?? 'mp4'}`,
  }
}
