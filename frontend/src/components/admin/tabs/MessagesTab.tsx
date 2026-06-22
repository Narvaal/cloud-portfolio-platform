import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Mail, Reply, X } from 'lucide-react'
import { getContacts, patchContact, type ContactMessage } from '../../../services/api'

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

function MessageModal({
  msg,
  onClose,
}: {
  msg: ContactMessage
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const meta = [
    msg.referrer ? { label: 'Referrer', value: msg.referrer === 'direct' ? 'Direct' : msg.referrer } : null,
    msg.device   ? { label: 'Device',   value: msg.device } : null,
    msg.country  ? { label: 'Country',  value: `${countryInfo(msg.country).flag} ${countryInfo(msg.country).name}` } : null,
    msg.timezone ? { label: 'Timezone', value: msg.timezone } : null,
    msg.locale   ? { label: 'Locale',   value: msg.locale } : null,
    formatTime(msg.timeOnSite) ? { label: 'Time on site', value: formatTime(msg.timeOnSite)! } : null,
    msg.ip       ? { label: 'IP',       value: msg.ip } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const replySubject = encodeURIComponent(`Re: [Portfolio] ${msg.name}`)

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
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message */}
        <div className="max-h-60 overflow-y-auto px-6 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
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
        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="font-mono text-xs text-zinc-400">{formatDate(msg.receivedAt)}</p>
          <a
            href={`mailto:${msg.email}?subject=${replySubject}`}
            className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600"
          >
            <Reply className="size-3.5" />
            Reply
          </a>
        </div>
      </div>
    </div>
  )
}

interface Props {
  onMarkRead: () => void
}

export function MessagesTab({ onMarkRead }: Props) {
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  useEffect(() => {
    getContacts().then(setContacts).finally(() => setLoading(false))
  }, [])

  async function handleRowClick(msg: ContactMessage) {
    setSelected(msg)
    if (!msg.read) {
      setContacts((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)))
      onMarkRead()
      await patchContact(msg.id)
    }
  }

  const unread = contacts.filter((m) => !m.read).length
  const totalPages = Math.max(1, Math.ceil(contacts.length / PAGE_SIZE))
  const paginated = contacts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Messages</h2>
          <p className="text-sm text-zinc-500">
            {loading ? 'Loading…' : unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {!loading && (
          <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
            <Mail className="size-3.5" />
            {contacts.length} total
          </span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[3%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
              <col className="w-[42%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-2 py-2.5" />
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
                  <td colSpan={6} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">
                    No messages yet
                  </td>
                </tr>
              )}
              {paginated.map((msg) => {
                const isUnread = !msg.read
                return (
                  <tr
                    key={msg.id}
                    onClick={() => handleRowClick(msg)}
                    className="cursor-pointer border-b border-zinc-50 last:border-0 transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                  >
                    {/* Unread dot */}
                    <td className="px-2 py-3 text-center">
                      {isUnread && (
                        <span className="inline-block size-1.5 rounded-full bg-accent-500" />
                      )}
                    </td>
                    <td className="overflow-hidden px-4 py-3">
                      <p className={`truncate text-xs ${isUnread ? 'font-semibold text-zinc-900 dark:text-zinc-50' : 'font-medium text-zinc-600 dark:text-zinc-400'}`}>
                        {msg.name}
                      </p>
                    </td>
                    <td className="overflow-hidden px-4 py-3">
                      <p className="truncate text-xs text-zinc-500">{msg.email}</p>
                    </td>
                    <td className="overflow-hidden px-4 py-3">
                      <p className={`line-clamp-2 text-xs ${isUnread ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500'}`}>
                        {msg.message}
                      </p>
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
                )
              })}
            </tbody>
          </table>
        </div>

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

      {selected && (
        <MessageModal msg={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
