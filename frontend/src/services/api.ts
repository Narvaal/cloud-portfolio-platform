import type { ExperienceItem, Project, VideoProject, Certification } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
}

/** Admin — returns a presigned S3 PUT URL for uploading a resume PDF. */
export async function getResumeUploadUrl(lang: 'en' | 'pt'): Promise<string | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/resume/presign?lang=${lang}`)
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
  await fetch(`${API_BASE}/resume/publish`, { method: 'POST' })
}

/** Admin — marks a contact message as read. */
export async function patchContact(id: string): Promise<void> {
  if (!API_BASE) return
  await fetch(`${API_BASE}/contacts/${encodeURIComponent(id)}`, { method: 'PATCH' })
}

/** Admin — lists all contact form submissions from DynamoDB, newest first. */
export async function getContacts(): Promise<ContactMessage[]> {
  if (!API_BASE) return []
  try {
    const res = await fetch(`${API_BASE}/contacts`)
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
    const res = await fetch(`${API_BASE}/content`)
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/** Phase 3 — sends the contact form to the backend (SES). */
export async function sendContactMessage(
  payload: ContactPayload,
): Promise<void> {
  if (!API_BASE) {
    // No backend yet: simulate a short round-trip so the UI flow is testable.
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }
  await postJson('/contact', payload)
}
