import { useEffect, useState } from 'react'
import { Globe, Mail, Users } from 'lucide-react'
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
  if (!seconds || seconds < 5) return '–'
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

export function AnalyticsTab() {
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getContacts().then(setContacts),
      getVisitorStats().then(setStats),
    ]).finally(() => setLoading(false))
  }, [])

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
        {loading && (
          <p className="py-4 text-center font-mono text-xs text-zinc-400">Loading…</p>
        )}
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
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                {['Name', 'Email', 'Message', 'Referrer', 'Device', 'Country', 'Time', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400 last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((msg, i) => (
                <tr
                  key={msg.id}
                  className={`border-b border-zinc-50 last:border-0 dark:border-zinc-800/60 ${
                    i % 2 !== 0 ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {msg.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">{msg.email}</td>
                  <td className="max-w-xs px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="line-clamp-2">{msg.message}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                    {msg.referrer && msg.referrer !== 'direct' ? msg.referrer : 'Direct'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                    {msg.device ?? '–'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                    {msg.country ? (
                      <span title={countryInfo(msg.country).name}>
                        {countryInfo(msg.country).flag} {msg.country}
                      </span>
                    ) : '–'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-zinc-500">
                    {formatTime(msg.timeOnSite)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-xs text-zinc-400">
                    {timeAgo(msg.receivedAt)}
                  </td>
                </tr>
              ))}
              {!loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">
                    No messages yet
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center font-mono text-xs text-zinc-400">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
