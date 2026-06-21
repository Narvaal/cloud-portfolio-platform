import { useEffect, useState } from 'react'

export function useScrollSpy(ids: string[], offset = 0): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '')
  const joinedIds = ids.join(',')

  useEffect(() => {
    const currentIds = joinedIds ? joinedIds.split(',') : []

    function update() {
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

  return activeId
}
