import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function assertFfmpegAvailable(): Promise<void> {
  try {
    await execFileAsync('ffmpeg', ['-version'])
  } catch {
    throw new Error('ffmpeg is not available')
  }
}

export async function runFfmpeg(args: string[]): Promise<void> {
  try {
    await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
  } catch (error) {
    const message =
      error instanceof Error && 'stderr' in error
        ? String((error as NodeJS.ErrnoException & { stderr?: string }).stderr ?? '')
        : ''
    throw new Error(message || 'ffmpeg failed')
  }
}

export async function getMediaDurationSeconds(
  filePath: string,
): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ])
    const duration = Number.parseFloat(stdout.trim())
    return Number.isFinite(duration) ? duration : undefined
  } catch {
    return undefined
  }
}
