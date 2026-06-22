import { createContext, useContext, useEffect, useState } from 'react'
import { getContent, type RawContent } from '../services/api'

interface ContentContextValue {
  content: RawContent | null
  refreshContent: () => Promise<void>
}

const STORAGE_KEY = 'portfolio_content'

const ContentContext = createContext<ContentContextValue>({
  content: null,
  refreshContent: async () => {},
})

function readFromStorage(): RawContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RawContent) : null
  } catch {
    return null
  }
}

function writeToStorage(c: RawContent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {}
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<RawContent | null>(readFromStorage)

  async function load() {
    const data = await getContent()
    if (data) {
      setContent(data)
      writeToStorage(data)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        setContent(JSON.parse(e.newValue) as RawContent)
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ContentContext.Provider value={{ content, refreshContent: load }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  return useContext(ContentContext)
}
