import { useState } from 'react'
import { BarChart2, FileText, LayoutDashboard, LogOut, Pencil } from 'lucide-react'
import { ResumeTab } from './tabs/ResumeTab'
import { ContentTab } from './tabs/ContentTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'

type Tab = 'analytics' | 'resume' | 'content'

const nav: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'content', label: 'Content', icon: Pencil },
]

interface Props {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: Props) {
  const [active, setActive] = useState<Tab>('analytics')

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <LayoutDashboard className="size-3.5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Admin</p>
            <p className="font-mono text-[10px] text-zinc-400">Portfolio CMS</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <p className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Menu
          </p>
          <ul className="space-y-0.5">
            {nav.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActive(id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active === id
                      ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-8">
          {active === 'analytics' && <AnalyticsTab />}
          {active === 'resume' && <ResumeTab />}
          {active === 'content' && <ContentTab />}
        </div>
      </main>
    </div>
  )
}
