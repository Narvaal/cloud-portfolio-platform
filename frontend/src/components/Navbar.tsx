import { useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { Container } from './ui/Container'
import { profile } from '../data/profile'
import { useLang } from '../i18n'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useTheme } from '../hooks/useTheme'
import type { Lang } from '../i18n/types'

function LangSlot({ lang }: { lang: string }) {
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: '1.1em', width: '2.2ch' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={lang}
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '-110%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {lang.toUpperCase()}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Navbar() {
  const { theme, toggle } = useTheme()
  const { lang, t, setLang } = useLang()
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
              {profile.name.split(' ').slice(0, 2).join(' ')}
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
            {/* Language switcher — shows TARGET language */}
            <button
              onClick={() => {
                const next = (lang === 'en' ? 'pt' : 'en') as Lang
                if (!('startViewTransition' in document)) { setLang(next); return }
                document.documentElement.setAttribute('data-vt', 'lang')
                ;(document as Document & { startViewTransition(cb: () => void): void })
                  .startViewTransition(() => { flushSync(() => setLang(next)) })
              }}
              aria-label={t.langSwitcher.ariaLabel}
              className="flex items-center rounded-lg px-2.5 py-2 font-mono text-sm font-bold text-accent-600 transition-colors hover:bg-zinc-100 dark:text-accent-400 dark:hover:bg-zinc-800"
            >
              <LangSlot lang={lang === 'en' ? 'pt' : 'en'} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
              }}
              aria-label="Toggle theme"
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </motion.div>
              </AnimatePresence>
            </button>

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
