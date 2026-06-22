import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, Mail, Users, X } from 'lucide-react'
import { getContacts, getVisitorStats, type ContactMessage, type VisitorStats } from '../../../services/api'

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  BR: { name: 'Brazil', flag: '🇧🇷' },
  US: { name: 'United States', flag: '🇺🇸' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  FR: { name: 'France', flag: '🇫🇷' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  IN: { name: 'India', flag: '🇮🇳' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  UA: { name: 'Ukraine', flag: '🇺🇦' },
  CN: { name: 'China', flag: '🇨🇳' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  AE: { name: 'UAE', flag: '🇦🇪' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  HU: { name: 'Hungary', flag: '🇭🇺' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  GR: { name: 'Greece', flag: '🇬🇷' },
  PE: { name: 'Peru', flag: '🇵🇪' },
  EC: { name: 'Ecuador', flag: '🇪🇨' },
  UY: { name: 'Uruguay', flag: '🇺🇾' },
  PY: { name: 'Paraguay', flag: '🇵🇾' },
  BO: { name: 'Bolivia', flag: '🇧🇴' },
  VE: { name: 'Venezuela', flag: '🇻🇪' },
}

function countryInfo(code: string) {
  return COUNTRY_INFO[code] ?? { name: code, flag: '🏳️' }
}

function formatTime(seconds?: number) {
  if (!seconds || seconds < 5) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAGE_SIZE = 10

function MessageModal({ msg, onClose }: { msg: ContactMessage; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const meta: { label: string; value: string }[] = [
    msg.referrer ? { label: 'Referrer', value: msg.referrer === 'direct' ? 'Direct' : msg.referrer } : null,
    msg.device   ? { label: 'Device',   value: msg.device } : null,
    msg.country  ? { label: 'Country',  value: `${countryInfo(msg.country).flag} ${countryInfo(msg.country).name}` } : null,
    msg.timezone ? { label: 'Timezone', value: msg.timezone } : null,
    msg.locale   ? { label: 'Locale',   value: msg.locale } : null,
    formatTime(msg.timeOnSite) ? { label: 'Time on site', value: formatTime(msg.timeOnSite)! } : null,
    msg.ip       ? { label: 'IP',       value: msg.ip } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{msg.name}</p>
            <a href={`mailto:${msg.email}`} className="text-sm text-accent-500 hover:underline">
              {msg.email}
            </a>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message */}
        <div className="max-h-60 overflow-y-auto px-6 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {msg.message}
          </p>
        </div>

        {/* Visitor metadata */}
        {meta.length > 0 && (
          <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Visitor info
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
              {meta.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</dt>
                  <dd className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Footer */}
        <div className="rounded-b-2xl border-t border-zinc-100 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="font-mono text-xs text-zinc-400">{formatDate(msg.receivedAt)}</p>
        </div>
      </div>
    </div>
  )
}

export function AnalyticsTab() {
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  useEffect(() => {
    Promise.all([
      getContacts().then(setContacts),
      getVisitorStats().then(setStats),
    ]).finally(() => setLoading(false))
  }, [])

  const totalPages = Math.max(1, Math.ceil(contacts.length / PAGE_SIZE))
  const paginated = contacts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const maxCountryCount = stats?.countries[0]?.count ?? 1

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h2>
      <p className="mb-6 text-sm text-zinc-500">Live data from DynamoDB.</p>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Users className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Total Visitors</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {loading ? '–' : (stats?.count ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Globe className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Countries</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {loading ? '–' : (stats?.countries.length ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Mail className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Messages</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {loading ? '–' : contacts.length}
          </p>
        </div>
      </div>

      {/* Visitors by country */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Visitors by Country
        </p>
        {loading && <p className="py-4 text-center font-mono text-xs text-zinc-400">Loading…</p>}
        {!loading && !stats?.countries.length && (
          <p className="py-4 text-center font-mono text-xs text-zinc-400">No visitor data yet</p>
        )}
        {!loading && !!stats?.countries.length && (
          <div className="space-y-3">
            {stats.countries.map((v) => {
              const info = countryInfo(v.code)
              return (
                <div key={v.code}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      <span>{info.flag}</span>
                      <span>{info.name}</span>
                    </span>
                    <span className="font-mono text-zinc-500">{v.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-accent-500"
                      style={{ width: `${(v.count / maxCountryCount) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Messages table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Contact Messages
            <span className="ml-2 normal-case font-normal text-zinc-400">— click a row to read</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[44%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                {['Name', 'Email', 'Message', 'Country', 'Date'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 ${i === 4 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">Loading…</td>
                </tr>
              )}
              {!loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">No messages yet</td>
                </tr>
              )}
              {paginated.map((msg, i) => (
                <tr
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`cursor-pointer border-b border-zinc-50 last:border-0 transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40 ${
                    i % 2 !== 0 ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : ''
                  }`}
                >
                  <td className="overflow-hidden px-4 py-3">
                    <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">{msg.name}</p>
                  </td>
                  <td className="overflow-hidden px-4 py-3">
                    <p className="truncate text-xs text-zinc-500">{msg.email}</p>
                  </td>
                  <td className="overflow-hidden px-4 py-3">
                    <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">{msg.message}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {msg.country ? (
                      <span title={countryInfo(msg.country).name}>
                        {countryInfo(msg.country).flag} {msg.country}
                      </span>
                    ) : '–'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">
                    {timeAgo(msg.receivedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {contacts.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <p className="font-mono text-xs text-zinc-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, contacts.length)} of {contacts.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex size-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 font-mono text-xs text-zinc-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`flex size-7 items-center justify-center rounded-md font-mono text-xs transition-colors ${
                        page === p
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex size-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <MessageModal msg={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
