import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

type AccessRequest = {
  email: string
  createdAt: string
}

type AccessRequestStore = {
  requests: AccessRequest[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'access-requests.json')
const TMP_PATH = `${STORE_PATH}.tmp`

async function ensureStore(): Promise<AccessRequestStore> {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    const raw = await readFile(STORE_PATH, 'utf8')
    return JSON.parse(raw) as AccessRequestStore
  } catch {
    const empty: AccessRequestStore = { requests: [] }
    await saveStore(empty)
    return empty
  }
}

async function saveStore(store: AccessRequestStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(TMP_PATH, JSON.stringify(store, null, 2), 'utf8')
  await rename(TMP_PATH, STORE_PATH)
}

export async function saveAccessRequest(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  const store = await ensureStore()
  const alreadyRequested = store.requests.some(
    (request) => request.email === normalized,
  )

  if (!alreadyRequested) {
    store.requests.unshift({
      email: normalized,
      createdAt: new Date().toISOString(),
    })
    await saveStore(store)
  }
}
