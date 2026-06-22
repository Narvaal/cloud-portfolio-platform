import { useEffect, useState } from 'react'
import { Globe, Mail, Users } from 'lucide-react'
import { getContacts, getVisitorCount, type ContactMessage } from '../../../services/api'

const mockVisitors = [
  { country: 'BR', flag: '🇧🇷', name: 'Brazil', count: 142 },
  { country: 'US', flag: '🇺🇸', name: 'United States', count: 87 },
  { country: 'DE', flag: '🇩🇪', name: 'Germany', count: 34 },
  { country: 'PT', flag: '🇵🇹', name: 'Portugal', count: 28 },
  { country: 'CA', flag: '🇨🇦', name: 'Canada', count: 19 },
  { country: 'NL', flag: '🇳🇱', name: 'Netherlands', count: 11 },
]
const maxCount = Math.max(...mockVisitors.map((v) => v.count))

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
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function AnalyticsTab() {
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getContacts().then(setContacts),
      getVisitorCount().then(setVisitorCount),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h2>
      <p className="mb-6 text-sm text-zinc-500">Visitor stats and contact messages.</p>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Users className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Total Visitors</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {visitorCount != null ? visitorCount.toLocaleString() : '–'}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Globe className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Countries</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{mockVisitors.length}</p>
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
        <div className="space-y-3">
          {mockVisitors.map((v) => (
            <div key={v.country}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span>{v.flag}</span>
                  <span>{v.name}</span>
                </span>
                <span className="font-mono text-zinc-500">{v.count}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-accent-500"
                  style={{ width: `${(v.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
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
                    {msg.country ?? '–'}
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
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center font-mono text-xs text-zinc-400"
                  >
                    No messages yet
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
