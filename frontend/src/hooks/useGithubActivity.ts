import { useEffect, useState } from 'react'

export interface GithubCommit {
  repo: string
  message: string
  date: string
  sha: string
  url: string
}

export interface GithubRepo {
  name: string
  description: string | null
  language: string | null
  stars: number
  url: string
}

export interface GithubActivity {
  commits: GithubCommit[]
  repos: GithubRepo[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const CACHE_KEY = 'github_activity_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function readCache(): GithubActivity | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function writeCache(data: GithubActivity) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // storage full or unavailable
  }
}

export function useGithubActivity() {
  const [data, setData] = useState<GithubActivity | null>(() => readCache())
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    if (readCache()) return

    async function load() {
      if (!API_BASE) {
        setLoading(false)
        return
      }
      try {
        // Proxied through Lambda so the GitHub token never reaches the browser
        const res = await fetch(`${API_BASE}/github-activity`)
        if (!res.ok) return
        const result = (await res.json()) as GithubActivity
        writeCache(result)
        setData(result)
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { data, loading }
}
