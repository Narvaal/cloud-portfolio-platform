import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, Download, Mail } from 'lucide-react'
import { Button } from './ui/Button'
import { Container } from './ui/Container'
import { GitHubIcon, LinkedInIcon } from './ui/BrandIcons'
import { GitHubPanel } from './GitHubPanel'
import { InfraStatusPanel } from './InfraStatusPanel'
import { profile } from '../data/profile'
import { useLang } from '../i18n'
import { useSettings } from '../contexts/SettingsContext'
import { useVisitorCount } from '../hooks/useVisitorCount'
import type { SocialIcon } from '../types'

// --- Slot-machine digit animation ---

function SlotDigit({ char }: { char: string }) {
  if (!/\d/.test(char)) return <span>{char}</span>
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: '1.1em', verticalAlign: 'text-bottom' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '-110%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
          className="block"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function SlotNumber({ count }: { count: number }) {
  const formatted = count.toLocaleString('en-US')
  const chars = formatted.split('')
  const totalDigits = chars.filter((c) => /\d/.test(c)).length
  let digitIdx = 0
  return (
    <span className="inline-flex">
      {chars.map((char, i) => {
        if (/\d/.test(char)) {
          const key = totalDigits - 1 - digitIdx++
          return <SlotDigit key={key} char={char} />
        }
        return <span key={`sep-${i}`}>{char}</span>
      })}
    </span>
  )
}

// ------------------------------------

type IconComponent = React.ElementType<{ className?: string }>

const iconMap: Record<SocialIcon, IconComponent> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  mail: Mail,
}

const greetings = [
  "Hello, I'm",
  "Olá, eu sou",
  "Hola, soy",
  "Bonjour, je suis",
  "Hallo, ich bin",
  "Ciao, sono",
]

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function ScrambleText({ text, onSettled }: { text: string; onSettled?: () => void }) {
  const [display, setDisplay] = useState(text)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSettledRef = useRef(onSettled)

  useEffect(() => { onSettledRef.current = onSettled }, [onSettled])

  useEffect(() => {
    let iteration = 0
    const isLatin = (c: string) => /[A-Za-z0-9,'. ]/.test(c)
    const latinCount = text.split('').filter(isLatin).length

    if (latinCount === 0) {
      setDisplay(text)
      onSettledRef.current?.()
      return
    }

    function scramble() {
      setDisplay(
        text.split('').map((char, i) => {
          if (!isLatin(char)) return char
          const latinsBefore = text.slice(0, i).split('').filter(isLatin).length
          if (latinsBefore < iteration) return char
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }).join('')
      )
      iteration += 0.3
      if (iteration < latinCount) {
        timerRef.current = setTimeout(scramble, 70)
      } else {
        setDisplay(text)
        onSettledRef.current?.()
      }
    }

    setDisplay(
      text.split('').map(c =>
        isLatin(c) ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] : c
      ).join('')
    )
    timerRef.current = setTimeout(scramble, 70)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [text])

  return <>{display}</>
}

export function Hero() {
  const { t } = useLang()
  const { count } = useVisitorCount()
  const { settings } = useSettings()
  const [greetingIdx, setGreetingIdx] = useState(0)
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSettled = useCallback(() => {
    if (readTimerRef.current) clearTimeout(readTimerRef.current)
    readTimerRef.current = setTimeout(() => {
      setGreetingIdx(i => (i + 1) % greetings.length)
    }, 2000)
  }, [])

  return (
    <section className="relative flex min-h-svh items-center pb-28 pt-24 sm:pb-16">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_360px]">

          {/* Presentation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {settings.openToWork && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {t.hero.openToWork}
                  </span>
                </span>
              </div>
            )}

            <div className="mb-4 h-5">
              <p className="font-mono text-sm font-medium text-accent-500">
                <ScrambleText text={greetings[greetingIdx]} onSettled={handleSettled} />
              </p>
            </div>

            <h1 className="mb-3 text-5xl sm:text-7xl">{profile.name}</h1>

            <p className="mb-6 text-xl font-medium text-accent-600 dark:text-accent-400 sm:text-2xl">
              {t.hero.role}
            </p>

            <p className="mb-8 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t.hero.tagline}
            </p>

            <div className="flex items-center gap-2 sm:gap-4">
              <Button href="#projects" size="lg">
                {t.hero.viewWork}
              </Button>
              <Button
                href={t.hero.resumeUrl}
                variant="secondary"
                size="lg"
                download
              >
                <Download className="size-4" />
                {t.hero.downloadResume}
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {([
                { label: 'GitHub', href: settings.githubUrl, icon: 'github' as SocialIcon },
                { label: 'LinkedIn', href: settings.linkedinUrl, icon: 'linkedin' as SocialIcon },
                { label: 'Email', href: `mailto:${settings.email}`, icon: 'mail' as SocialIcon },
              ]).map((social) => {
                const Icon = iconMap[social.icon]
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.icon !== 'mail' ? '_blank' : undefined}
                    rel="noreferrer"
                    aria-label={social.label}
                    className="text-zinc-400 transition-colors hover:text-accent-500 dark:text-zinc-500 dark:hover:text-accent-400"
                  >
                    <Icon className="size-5" />
                  </a>
                )
              })}
              <span className="ml-1 text-sm text-zinc-400 dark:text-zinc-600">
                {t.hero.location}
              </span>
              {count !== null && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <SlotNumber count={count} />
                    <span>{t.footer.visitorsLabel}</span>
                  </span>
                </>
              )}
            </div>
          </motion.div>

          {/* Right column — stacked panels */}
          <div className="flex flex-col gap-4">
            <GitHubPanel />
            <InfraStatusPanel />
          </div>

        </div>
      </Container>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <a
          href="#about"
          aria-label="Scroll to about"
          className="flex flex-col items-center gap-1 text-zinc-400 transition-colors hover:text-accent-500 dark:text-zinc-600 dark:hover:text-accent-400"
        >
          <span className="font-mono text-xs">{t.hero.scroll}</span>
          <ArrowDown className="size-4 animate-bounce" />
        </a>
      </motion.div>
    </section>
  )
}
