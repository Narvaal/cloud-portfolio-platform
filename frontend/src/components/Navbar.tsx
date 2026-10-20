import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Languages, Menu, Moon, Sun, X } from 'lucide-react'
import { Container } from './ui/Container'
import { useSettings } from '../contexts/SettingsContext'
import { useLang } from '../i18n'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useTheme } from '../hooks/useTheme'
import type { Lang } from '../i18n/types'

const languages: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

function LangMenu() {
  const { lang, t, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(next: Lang) {
    setOpen(false)
    if (next === lang) return
    if (!('startViewTransition' in document)) { setLang(next); return }
    document.documentElement.setAttribute('data-vt', 'lang')
    ;(document as Document & { startViewTransition(cb: () => void): void })
      .startViewTransition(() => { flushSync(() => setLang(next)) })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.langSwitcher.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-0.5 rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <Languages className="size-4" />
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 min-w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={lang === l.code}
                onClick={() => choose(l.code)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  lang === l.code
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                }`}
              >
                {l.label}
                {lang === l.code && <Check className="size-3.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Navbar() {
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const ids = t.nav.map((item) => item.id)
  const [activeId, notifyNavClick] = useScrollSpy(ids, 250)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-100/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <img
              src="/favicon/logo.png"
              alt="Alessandro Bezerra logo"
              className="h-8 w-8 object-contain dark:invert"
            />
            <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {settings.name.split(' ').slice(0, 2).join(' ')}
            </span>
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            {t.nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => notifyNavClick(item.id)}
                className={`text-sm transition-colors ${
                  activeId === item.id
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
              }}
              aria-label="Toggle theme"
              className="flex items-center justify-center rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <LangMenu />

            {/* Mobile menu button */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800 md:hidden"
          >
            <Container>
              <nav className="flex flex-col gap-1 py-4">
                {t.nav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      notifyNavClick(item.id)
                      setOpen(false)
                      const id = item.id
                      setTimeout(() => {
                        const el = document.getElementById(id)
                        if (!el) return
                        const top = el.getBoundingClientRect().top + window.scrollY - 64
                        window.scrollTo({ top, behavior: 'smooth' })
                      }, 400)
                    }}
                    className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeId === item.id
                        ? 'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
