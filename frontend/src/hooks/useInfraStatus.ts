import { useEffect, useState } from 'react'
import { getInfraStatus, type InfraStatus } from '../services/api'

const POLL_MS = 60_000

/**
 * Phase 6 — fetches infra status on mount and re-polls every 60s.
 * Returns null until the backend exists (VITE_API_BASE_URL unset).
 */
export function useInfraStatus(): { status: InfraStatus | null } {
  const [status, setStatus] = useState<InfraStatus | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      const data = await getInfraStatus()
      if (active && data) setStatus(data)
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return { status }
}
