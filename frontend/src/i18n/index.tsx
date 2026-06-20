import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { Lang, Translations } from './types'
import { en } from './en'
import { pt } from './pt'

const translations: Record<Lang, Translations> = { en, pt }

interface LangContextValue {
  lang: Lang
  t: Translations
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue | null>(null)

function getInitialLang(): Lang {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('lang')
    if (saved === 'pt' || saved === 'en') return saved
  }
  return 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }, [])

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
