import { useEffect, useState } from 'react'
import { fetchVisitorCount, getVisitorCount } from '../services/api'

const POLL_MS = 30_000

/**
 * Phase 4 — registers the visit on mount (POST) then polls GET every 30s.
 * Returns null until the backend exists (VITE_API_BASE_URL unset).
 */
export function useVisitorCount(): { count: number | null } {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    fetchVisitorCount().then((n) => {
      if (active && n !== null) setCount(n)
    })

    const id = setInterval(async () => {
      const n = await getVisitorCount()
      if (active && n !== null) setCount(n)
    }, POLL_MS)

    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return { count }
}
