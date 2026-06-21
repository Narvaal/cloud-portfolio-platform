import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { Container } from './ui/Container'
import { profile } from '../data/profile'
import { useLang } from '../i18n'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useTheme } from '../hooks/useTheme'
import type { Lang } from '../i18n/types'

export function Navbar() {
  const { theme, toggle } = useTheme()
  const { lang, t, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ids = t.nav.map((item) => item.id)
  const [activeId, notifyNavClick] = useScrollSpy(ids, 250)

  function handleLangToggle() {
    setLang((lang === 'en' ? 'pt' : 'en') as Lang)
  }

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
            {/* Language switcher */}
            <button
              onClick={handleLangToggle}
              aria-label={t.langSwitcher.ariaLabel}
              className="flex items-center gap-0.5 rounded-lg px-2 py-2 font-mono text-xs font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span
                className={
                  lang === 'en'
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-zinc-400 dark:text-zinc-600'
                }
              >
                EN
              </span>
              <span className="mx-0.5 text-zinc-300 dark:text-zinc-700">/</span>
              <span
                className={
                  lang === 'pt'
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-zinc-400 dark:text-zinc-600'
                }
              >
                PT
              </span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
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
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => { notifyNavClick(item.id); setOpen(false) }}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      activeId === item.id
                        ? 'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
