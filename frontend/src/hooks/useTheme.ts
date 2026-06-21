import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark'

      if (!origin || !('startViewTransition' in document)) {
        setTheme(next)
        return
      }

      document.documentElement.style.setProperty('--vt-x', `${origin.x}px`)
      document.documentElement.style.setProperty('--vt-y', `${origin.y}px`)
      ;(document as Document & { startViewTransition(cb: () => void): void }).startViewTransition(
        () => { flushSync(() => setTheme(next)) },
      )
    },
    [theme],
  )

  return { theme, toggle }
}
