import { useEffect, useState } from 'react'
import { getInfraStatus, type InfraStatus } from '../services/api'

const POLL_MS = 60_000

export function useInfraStatus(): { status: InfraStatus | null; responseTime: number | null } {
  const [status, setStatus] = useState<InfraStatus | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      const t0 = performance.now()
      const data = await getInfraStatus()
      const elapsed = Math.round(performance.now() - t0)
      if (active && data) {
        setStatus(data)
        setResponseTime(elapsed)
      }
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return { status, responseTime }
}
