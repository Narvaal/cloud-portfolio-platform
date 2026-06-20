import { Globe, Mail, Users } from 'lucide-react'

const mockVisitors = [
  { country: 'BR', flag: '🇧🇷', name: 'Brazil', count: 142 },
  { country: 'US', flag: '🇺🇸', name: 'United States', count: 87 },
  { country: 'DE', flag: '🇩🇪', name: 'Germany', count: 34 },
  { country: 'PT', flag: '🇵🇹', name: 'Portugal', count: 28 },
  { country: 'CA', flag: '🇨🇦', name: 'Canada', count: 19 },
  { country: 'NL', flag: '🇳🇱', name: 'Netherlands', count: 11 },
]

const mockMessages = [
  {
    id: '1',
    name: 'Ana Costa',
    email: 'ana@example.com',
    message: "Hi Alessandro, I came across your portfolio and I'd love to discuss a backend role we have open...",
    date: '2026-06-18T14:32:00Z',
  },
  {
    id: '2',
    name: 'Marcus Weber',
    email: 'marcus@example.com',
    message: 'Great work on the Bank Simulator project! Would you be interested in freelancing?',
    date: '2026-06-15T09:11:00Z',
  },
  {
    id: '3',
    name: 'Sofia Ribeiro',
    email: 'sofia@example.com',
    message: 'Olá! Vi seu portfólio e queria entrar em contato sobre uma vaga na nossa empresa...',
    date: '2026-06-10T17:45:00Z',
  },
]

const totalVisitors = mockVisitors.reduce((sum, v) => sum + v.count, 0)
const maxCount = Math.max(...mockVisitors.map((v) => v.count))

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function AnalyticsTab() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Visitor stats and contact messages. Data is mocked — will connect to DynamoDB.
      </p>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Users className="size-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Total Visitors</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalVisitors.toLocaleString()}</p>
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
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{mockMessages.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visitors by country */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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

        {/* Messages */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Contact Messages
          </p>
          <div className="space-y-4">
            {mockMessages.map((msg) => (
              <div key={msg.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{msg.name}</span>
                    <span className="ml-2 text-xs text-zinc-400">{msg.email}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">{timeAgo(msg.date)}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[10px] text-zinc-300 dark:text-zinc-700">
        Mock data — real data from DynamoDB when backend is connected
      </p>
    </div>
  )
}
