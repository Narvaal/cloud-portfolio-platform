import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { loginAdmin } from '../../services/api'

interface Props {
  onLogin: () => void
}

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const token = await loginAdmin(password)
      sessionStorage.setItem('admin_token', token)
      onLogin()
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100">
            <Lock className="size-5 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">Portfolio Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-widest text-zinc-400">
            Password
          </label>
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 pr-10 text-sm outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {error && (
            <p className="mb-3 text-xs text-red-500">Incorrect password.</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
