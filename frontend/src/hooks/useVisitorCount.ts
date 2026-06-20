import { useEffect, useState } from 'react'
import { fetchVisitorCount } from '../services/api'

interface VisitorCountState {
  count: number | null
  loading: boolean
}

/**
 * Visitor counter (Phase 4). Returns `count: null` until the backend exists,
 * which the UI renders as a placeholder.
 */
export function useVisitorCount(): VisitorCountState {
  const [state, setState] = useState<VisitorCountState>({
    count: null,
    loading: true,
  })

  useEffect(() => {
    let active = true
    fetchVisitorCount()
      .then((count) => {
        if (active) setState({ count, loading: false })
      })
      .catch(() => {
        if (active) setState({ count: null, loading: false })
      })
    return () => {
      active = false
    }
  }, [])

  return state
}
