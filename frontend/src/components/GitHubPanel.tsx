import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { GitHubIcon } from './ui/BrandIcons'
import { useGithubActivity } from '../hooks/useGithubActivity'
import { useLang } from '../i18n'

const langColors: Record<string, string> = {
  Java: 'bg-orange-400',
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-400',
  GDScript: 'bg-teal-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-red-500',
  'C#': 'bg-purple-400',
  Kotlin: 'bg-violet-400',
}

function langColor(lang: string | null) {
  return lang ? (langColors[lang] ?? 'bg-zinc-400') : 'bg-zinc-400'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 dark:bg-zinc-800 ${className}`} />
}

export function GitHubPanel() {
  const { t } = useLang()
  const { data, loading } = useGithubActivity('Narvaal')
  const gh = t.github

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full rounded-xl border border-zinc-200 bg-white/80 p-5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitHubIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {gh.title}
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs text-zinc-400">Narvaal</span>
        </span>
      </div>

      {/* Recent Commits */}
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
        {gh.commits}
      </p>

      <div className="mb-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : data?.commits.length ? (
          data.commits.map((c, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[10px] font-semibold text-accent-500 dark:text-accent-400">
                  {c.repo}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">{timeAgo(c.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-zinc-400">{c.sha}</span>
                <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">{c.message}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-400">{gh.noActivity}</p>
        )}
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-zinc-100 dark:bg-zinc-800" />

      {/* Repos */}
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
        {gh.repos}
      </p>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))
        ) : data?.repos.length ? (
          data.repos.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                {r.language && (
                  <span className={`size-2 shrink-0 rounded-full ${langColor(r.language)}`} />
                )}
                <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {r.name}
                </span>
                {r.language && (
                  <span className="hidden truncate text-[10px] text-zinc-400 sm:block">{r.language}</span>
                )}
              </div>
              {r.stars > 0 && (
                <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                  <Star className="size-2.5" />
                  <span className="font-mono text-[10px]">{r.stars}</span>
                </div>
              )}
            </a>
          ))
        ) : null}
      </div>
    </motion.div>
  )
}
