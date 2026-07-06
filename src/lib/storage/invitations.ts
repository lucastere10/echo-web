import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { generateToken } from '#/lib/crypto'
import { env } from '#/lib/env'
import { errors } from '#/lib/errors'

export type Invitation = {
  token: string
  createdAt: string
  expiresAt: string
  maxUploads: number
  maxFilesPerUpload: number
  uploadsUsed: number
  revoked: boolean
}

type InvitationStore = {
  invitations: Invitation[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'invitations.json')
const TMP_PATH = `${STORE_PATH}.tmp`

async function ensureStore(): Promise<InvitationStore> {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    const raw = await readFile(STORE_PATH, 'utf8')
    return JSON.parse(raw) as InvitationStore
  } catch {
    const empty: InvitationStore = { invitations: [] }
    await saveStore(empty)
    return empty
  }
}

async function saveStore(store: InvitationStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(TMP_PATH, JSON.stringify(store, null, 2), 'utf8')
  await rename(TMP_PATH, STORE_PATH)
}

export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date(invitation.expiresAt).getTime() <= Date.now()
}

export function isInvitationActive(invitation: Invitation): boolean {
  return !invitation.revoked && !isInvitationExpired(invitation)
}

export function isInvitationValid(invitation: Invitation): boolean {
  return (
    isInvitationActive(invitation) &&
    invitation.uploadsUsed < invitation.maxUploads
  )
}

export function getInvitationStatus(invitation: Invitation): 'active' | 'expired' | 'revoked' {
  if (invitation.revoked) return 'revoked'
  if (isInvitationExpired(invitation)) return 'expired'
  return 'active'
}

export async function listInvitations(): Promise<Invitation[]> {
  const store = await ensureStore()
  return store.invitations
}

export async function getInvitationByToken(
  token: string,
): Promise<Invitation | null> {
  const store = await ensureStore()
  return store.invitations.find((invitation) => invitation.token === token) ?? null
}

export async function createInvitation(input: {
  maxUploads: number
  maxFilesPerUpload: number
}): Promise<Invitation> {
  const maxFilesPerUpload = Math.min(
    input.maxFilesPerUpload,
    env.MAX_FILES_PER_UPLOAD,
  )

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + env.INVITE_EXPIRATION_HOURS * 60 * 60 * 1000,
  )

  const invitation: Invitation = {
    token: generateToken(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxUploads: input.maxUploads,
    maxFilesPerUpload,
    uploadsUsed: 0,
    revoked: false,
  }

  const store = await ensureStore()
  store.invitations.unshift(invitation)
  await saveStore(store)
  return invitation
}

export async function revokeInvitation(token: string): Promise<Invitation | null> {
  const store = await ensureStore()
  const invitation = store.invitations.find((item) => item.token === token)
  if (!invitation) return null
  invitation.revoked = true
  await saveStore(store)
  return invitation
}

export async function incrementUploadsUsed(token: string): Promise<Invitation> {
  const store = await ensureStore()
  const invitation = store.invitations.find((item) => item.token === token)
  if (!invitation) {
    throw errors.forbidden('Invitation not found.')
  }
  if (invitation.revoked) {
    throw errors.inviteRevoked()
  }
  if (isInvitationExpired(invitation)) {
    throw errors.inviteExpired()
  }
  if (invitation.uploadsUsed >= invitation.maxUploads) {
    throw errors.uploadLimitReached()
  }

  invitation.uploadsUsed += 1
  await saveStore(store)
  return invitation
}
