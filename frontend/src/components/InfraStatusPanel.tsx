import { motion } from 'framer-motion'
import { AWSIcon } from './ui/BrandIcons'
import { useInfraStatus } from '../hooks/useInfraStatus'
import { useLang } from '../i18n'
import type { InfraStatus } from '../services/api'

type ServiceStatus = InfraStatus['api'] | undefined

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const color =
    status === 'online' ? 'bg-emerald-400' :
    status === 'offline' ? 'bg-red-400' :
    status === 'degraded' ? 'bg-amber-400' :
    'bg-zinc-300 dark:bg-zinc-700'
  return <span className={`size-1.5 shrink-0 rounded-full ${color}`} />
}

function StatusRow({
  label,
  status,
  statusText,
}: {
  label: string
  status: ServiceStatus
  statusText: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>
      </span>
    </div>
  )
}

export function InfraStatusPanel() {
  const { t } = useLang()
  const { status } = useInfraStatus()
  const i = t.infra

  function statusText(s: ServiceStatus): string {
    if (!s) return '–'
    return s === 'online' ? i.statusOnline :
           s === 'offline' ? i.statusOffline :
           i.statusDegraded
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
      className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AWSIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {i.title}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            {status?.version ?? '–'}
          </span>
        </div>

        {/* Status rows */}
        <div className="space-y-2.5">
          <StatusRow
            label={i.apiLabel}
            status={status?.api}
            statusText={statusText(status?.api)}
          />
          <StatusRow
            label={i.frontendLabel}
            status={status?.frontend}
            statusText={statusText(status?.frontend)}
          />

          <div className="border-t border-zinc-100 dark:border-zinc-800" />

          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              {i.lastDeployLabel}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {status ? i.relativeTime(minutesSince(status.lastDeploy)) : '–'}
            </span>
          </div>

          {status?.lastCommit && (
            <div>
              <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                {i.lastCommitLabel}
              </p>
              <span className="font-mono text-[10px] text-accent-500 dark:text-accent-400">
                {status.lastCommit.sha.slice(0, 7)}
              </span>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                {status.lastCommit.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
