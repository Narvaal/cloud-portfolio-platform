import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Star } from 'lucide-react'
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

function CommitRow({ repo, sha, message, date }: { repo: string; sha: string; message: string; date: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] font-semibold text-accent-500 dark:text-accent-400">
          {repo}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-zinc-400">{timeAgo(date)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-zinc-400">{sha}</span>
        <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">{message}</span>
      </div>
    </div>
  )
}

export function GitHubPanel() {
  const { t } = useLang()
  const { data, loading } = useGithubActivity('Narvaal')
  const [expanded, setExpanded] = useState(false)
  const gh = t.github
  const { expandLabel, collapseLabel } = t.projects

  const firstCommit = data?.commits[0]
  const restCommits = data?.commits.slice(1) ?? []

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      {/* Always-visible section */}
      <div className="p-5 pb-3">
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

        {/* Most recent commit (always visible) */}
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          {gh.commits}
        </p>

        <div className="mb-1">
          {loading ? (
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : firstCommit ? (
            <CommitRow {...firstCommit} />
          ) : (
            <p className="text-xs text-zinc-400">{gh.noActivity}</p>
          )}
        </div>
      </div>

      {/* Expandable section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="extra"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 px-5 pb-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              ) : (
                restCommits.map((c, i) => <CommitRow key={i} {...c} />)
              )}
            </div>

            {/* Divider + Repos */}
            <div className="border-t border-zinc-100 px-5 pb-4 pt-4 dark:border-zinc-800">
              <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                {gh.repos}
              </p>
              <div className="space-y-1.5">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                ) : (
                  data?.repos.map((r) => (
                    <a
                      key={r.name}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
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
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand / collapse row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-zinc-100 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
      >
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-400"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
        <span className="text-xs text-zinc-400">{expanded ? collapseLabel : expandLabel}</span>
      </button>
    </motion.div>
  )
}
