import { useCallback, useEffect, useRef, useState } from 'react'

export function useScrollSpy(ids: string[], offset = 0): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '')
  const suppressUntil = useRef(0)
  const joinedIds = ids.join(',')

  useEffect(() => {
    const currentIds = joinedIds ? joinedIds.split(',') : []

    function update() {
      if (Date.now() < suppressUntil.current) return

      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
      if (atBottom) {
        setActiveId(currentIds[currentIds.length - 1] ?? '')
        return
      }

      const threshold = window.scrollY + offset
      let current = currentIds[0] ?? ''
      for (const id of currentIds) {
        const el = document.getElementById(id)
        if (el) {
          const absoluteTop = el.getBoundingClientRect().top + window.scrollY
          if (absoluteTop <= threshold) current = id
        }
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [joinedIds, offset])

  const notifyClick = useCallback((id: string) => {
    setActiveId(id)
    suppressUntil.current = Date.now() + 1200
  }, [])

  return [activeId, notifyClick]
}
