import { Mail } from 'lucide-react'
import { Container } from './ui/Container'
import { GitHubIcon, LinkedInIcon } from './ui/BrandIcons'
import { profile } from '../data/profile'
import { useLang } from '../i18n'
import { useInfraStatus } from '../hooks/useInfraStatus'

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
}

export function Footer() {
  const { t } = useLang()
  const { status } = useInfraStatus()

  return (
    <footer className="border-t border-zinc-100 dark:border-zinc-800">
      <Container>
        {/* Top row */}
        <div className="flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {profile.name.split(' ').slice(0, 2).join(' ')}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
              Backend &amp; Cloud Engineer
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Narvaal"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <GitHubIcon className="size-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/narvaal"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <LinkedInIcon className="size-4" />
            </a>
            <a
              href={`mailto:${profile.email}`}
              aria-label="Email"
              className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col items-start justify-between gap-2 border-t border-zinc-100 py-4 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {profile.name.split(' ').slice(0, 2).join(' ')} · {t.footer.built}
          </p>
          {status && (
            <p className="font-mono">
              {t.infra.lastDeployLabel}: {t.infra.relativeTime(minutesSince(status.lastDeploy))}
            </p>
          )}
        </div>
      </Container>
    </footer>
  )
}
