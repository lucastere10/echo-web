import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

let activeJobs = 0

export async function withJobSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeJobs >= env.MAX_CONCURRENT_JOBS) {
    throw errors.concurrentJobs()
  }

  activeJobs += 1
  try {
    return await fn()
  } finally {
    activeJobs -= 1
  }
}
