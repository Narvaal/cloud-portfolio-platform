import { useEffect, useState } from 'react'
import { fetchVisitorCount } from '../services/api'

export function useVisitorCount(): { count: number | null } {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    fetchVisitorCount().then((n) => {
      if (active && n !== null) setCount(n)
    })
    return () => { active = false }
  }, [])

  return { count }
}
