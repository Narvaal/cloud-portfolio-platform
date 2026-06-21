/**
 * Thin API client for the backend (API Gateway).
 *
 * The base URL comes from VITE_API_BASE_URL. While the backend doesn't exist
 * yet (Phases 3–5), it is simply unset and the calls below resolve to safe
 * fallbacks so the UI keeps working locally.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface ContactPayload {
  name: string
  email: string
  message: string
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

/** Phase 4 — reads the current visitor count without incrementing (used for polling). */
export async function getVisitorCount(): Promise<number | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/visitors`)
    if (!res.ok) return null
    const data = await res.json() as { count: number }
    return data.count
  } catch {
    return null
  }
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
