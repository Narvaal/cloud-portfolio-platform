import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Lang, Translations } from './types'
import { en } from './en'
import { pt } from './pt'
import { useContent } from '../contexts/ContentContext'

const base: Record<Lang, Translations> = { en, pt }

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
  const { content } = useContent()

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }, [])

  const t = useMemo<Translations>(() => {
    const b = base[lang]
    if (!content) return b
    return {
      ...b,
      about: {
        ...b.about,
        paragraphs: content.about?.[lang]?.paragraphs ?? b.about.paragraphs,
        skills:     content.about?.[lang]?.skills     ?? b.about.skills,
      },
      experience: {
        ...b.experience,
        items: content.experience?.[lang] ?? b.experience.items,
      },
      projects: {
        ...b.projects,
        items:         content.projects?.[lang]?.items         ?? b.projects.items,
        showcaseItems: content.projects?.[lang]?.showcaseItems ?? b.projects.showcaseItems,
      },
      certifications: {
        ...b.certifications,
        items: content.certifications?.[lang] ?? b.certifications.items,
      },
    }
  }, [lang, content])

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
