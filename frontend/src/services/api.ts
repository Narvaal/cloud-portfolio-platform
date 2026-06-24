import type { ExperienceItem, Project, VideoProject, Certification } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function getAdminToken(): string | null {
  return sessionStorage.getItem('admin_token')
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Authenticates with the backend and returns a session token. */
export async function loginAdmin(password: string): Promise<string> {
  if (!API_BASE) {
    // Local dev: compare against VITE_ADMIN_PASSWORD (no real backend)
    await new Promise((r) => setTimeout(r, 300))
    const local = import.meta.env.VITE_ADMIN_PASSWORD || 'admin'
    if (password !== local) throw new Error('Unauthorized')
    return 'local-dev-token'
  }
  const res = await fetch(`${API_BASE}/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('Unauthorized')
  const data = (await res.json()) as { token: string }
  return data.token
}

export interface ContactPayload {
  name: string
  email: string
  message: string
  timeOnSite?: number
  timezone?: string
  locale?: string
  referrer?: string
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Phase 4 — registers the visit (increments) and returns the current count. */
export async function fetchVisitorCount(): Promise<number | null> {
  if (!API_BASE) return null
  try {
    const data = await postJson<{ count: number }>('/visitors', {})
    return data.count
  } catch {
    return null
  }
}

export interface VisitorStats {
  count: number
  countries: { code: string; count: number }[]
}

/** Admin — returns visitor total + country breakdown from DynamoDB. */
export async function getVisitorStats(): Promise<VisitorStats | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/visitors`)
    if (!res.ok) return null
    return res.json() as Promise<VisitorStats>
  } catch {
    return null
  }
}

/** Reads only the total visitor count (used outside admin). */
export async function getVisitorCount(): Promise<number | null> {
  const stats = await getVisitorStats()
  return stats?.count ?? null
}

export interface InfraStatus {
  api: 'online' | 'offline' | 'degraded'
  frontend: 'online' | 'offline' | 'degraded'
  /** ISO 8601 timestamp of the last deploy, written by GitHub Actions via SSM. */
  lastDeploy: string
  version: string
  /** Controlled via admin panel. When absent, falls back to profile.openToWork. */
  openToWork?: boolean
  /** SHA + message + date of the last deployed commit, written by GitHub Actions via SSM. */
  lastCommit?: { sha: string; message: string; date?: string }
}

/** Phase 6 — reads API health, frontend health, last deploy time and version from the backend. */
export async function getInfraStatus(): Promise<InfraStatus | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) return null
    return res.json() as Promise<InfraStatus>
  } catch {
    return null
  }
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  referrer?: string
  device?: string
  timezone?: string
  locale?: string
  timeOnSite?: number
  country?: string
  ip?: string
  receivedAt: string
  read?: boolean
}

/** Returns all settings as a `{ key: value }` string map. */
export async function getSettings(): Promise<Record<string, string>> {
  if (!API_BASE) return {}
  try {
    const res = await fetch(`${API_BASE}/settings`)
    if (!res.ok) return {}
    return res.json() as Promise<Record<string, string>>
  } catch {
    return {}
  }
}

/** Admin — updates a single setting by key. */
export async function patchSetting(key: string, value: string): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/settings/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ value }),
  })
}

/** Admin — returns a presigned S3 PUT URL for uploading a resume PDF. */
export async function getResumeUploadUrl(lang: 'en' | 'pt'): Promise<string | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/resume/presign?lang=${lang}`, { headers: adminHeaders() })
    if (!res.ok) return null
    const data = (await res.json()) as { uploadUrl: string }
    return data.uploadUrl
  } catch {
    return null
  }
}

/** Admin — triggers a CloudFront invalidation for /resume/* after upload. */
export async function publishResume(): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/resume/publish`, { method: 'POST', headers: adminHeaders() })
}

/** Admin — marks a contact message as read. */
export async function patchContact(id: string): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/contacts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: adminHeaders(),
  })
}

/** Admin — lists all contact form submissions from DynamoDB, newest first. */
export async function getContacts(): Promise<ContactMessage[]> {
  if (!API_BASE) return []
  try {
    const res = await fetch(`${API_BASE}/contacts`, { headers: adminHeaders() })
    if (!res.ok) return []
    const data = (await res.json()) as { items: ContactMessage[] }
    return data.items
  } catch {
    return []
  }
}

// ── Content CMS ──────────────────────────────────────────────────────────────

export interface ContentAbout {
  paragraphs: string[]
  skills?: string[]
}

export interface ContentProjects {
  items: Project[]
  showcaseItems: VideoProject[]
}

type LangMap<T> = { en?: T; pt?: T }

export interface RawContent {
  about?: LangMap<ContentAbout>
  experience?: LangMap<ExperienceItem[]>
  projects?: LangMap<ContentProjects>
  certifications?: LangMap<Certification[]>
}

/** Fetches all content types for both langs in one call: `{ [type]: { [lang]: data } }` */
export async function getContent(): Promise<RawContent | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/content`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json() as Promise<RawContent>
  } catch {
    return null
  }
}

/** Admin — replaces one content type + lang in DynamoDB. */
export async function putContent(
  type: string,
  lang: 'en' | 'pt',
  data: unknown,
): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/content/${encodeURIComponent(type)}?lang=${lang}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  })
}

// ── Video CMS ─────────────────────────────────────────────────────────────────

/** Admin — lists all .mp4 files under showcase/video/ in S3. */
export async function getVideoList(): Promise<string[]> {
  if (!API_BASE) return []
  try {
    const res = await fetch(`${API_BASE}/video/list`, { cache: 'no-store', headers: adminHeaders() })
    if (!res.ok) return []
    const data = (await res.json()) as { files: string[] }
    return data.files
  } catch {
    return []
  }
}

/** Admin — returns a presigned S3 PUT URL for uploading a video. */
export async function getVideoUploadUrl(filename: string): Promise<string | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(
      `${API_BASE}/video/presign?filename=${encodeURIComponent(filename)}`,
      { headers: adminHeaders() },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { uploadUrl: string }
    return data.uploadUrl
  } catch {
    return null
  }
}

/** Admin — triggers a CloudFront invalidation for /showcase/video/* after upload. */
export async function publishVideo(): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/video/publish`, { method: 'POST', headers: adminHeaders() })
}

/** Admin — deletes a video from S3. */
export async function deleteVideo(filename: string): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/video/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
}

/** Phase 3 — sends the contact form to the backend (SES). */
export async function sendContactMessage(
  payload: ContactPayload,
): Promise<void> {
  if (!API_BASE) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }
  const res = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? 'Failed to send message')
  }
}
