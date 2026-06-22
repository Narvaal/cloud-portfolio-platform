import { useEffect, useState } from 'react'
import { Globe, Mail, Users } from 'lucide-react'
import { getContacts, getVisitorStats, type VisitorStats } from '../../../services/api'

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

export function AnalyticsTab() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [messageCount, setMessageCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getVisitorStats().then(setStats),
      getContacts().then((items) => setMessageCount(items.length)),
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
            {loading ? '–' : (messageCount ?? 0)}
          </p>
        </div>
      </div>

      {/* Visitors by country */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
    </div>
  )
}
