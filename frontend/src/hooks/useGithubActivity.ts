import { useEffect, useState } from 'react'

export interface GithubCommit {
  repo: string
  message: string
  date: string
  sha: string
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

const CACHE_KEY = 'github_activity_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const SKIP_REPOS = new Set(['build-your-own-x', 'awesome-electronics'])

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

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined

function githubHeaders(): HeadersInit {
  return GITHUB_TOKEN
    ? { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
    : { Accept: 'application/vnd.github+json' }
}

interface GithubEvent {
  type: string
  repo: { name: string }
  created_at: string
  payload: {
    commits?: { sha: string; message: string }[]
  }
}

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(() => readCache())
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    if (readCache()) return

    async function load() {
      try {
        const [eventsRes, reposRes] = await Promise.all([
          fetch(
            `https://api.github.com/users/${username}/events?per_page=100`,
            { headers: githubHeaders() },
          ),
          fetch(
            `https://api.github.com/users/${username}/repos?sort=updated&per_page=8&type=public`,
            { headers: githubHeaders() },
          ),
        ])

        if (!eventsRes.ok || !reposRes.ok) return

        const rawEvents: GithubEvent[] = await eventsRes.json()
        const rawRepos = await reposRes.json()

        const commits: GithubCommit[] = (Array.isArray(rawEvents) ? rawEvents : [])
          .filter(e => e.type === 'PushEvent' && Array.isArray(e.payload.commits))
          .flatMap(e =>
            (e.payload.commits ?? []).map(c => ({
              repo: e.repo.name.split('/')[1],
              message: c.message.split('\n')[0],
              date: e.created_at,
              sha: c.sha.slice(0, 7),
            })),
          )
          .filter(c => !SKIP_REPOS.has(c.repo))
          .slice(0, 6)

        const repos: GithubRepo[] = (Array.isArray(rawRepos) ? rawRepos : [])
          .filter((r: { name: string }) => !SKIP_REPOS.has(r.name))
          .slice(0, 4)
          .map((r: { name: string; description: string | null; language: string | null; stargazers_count: number; html_url: string }) => ({
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            url: r.html_url,
          }))

        const result = { commits, repos }
        writeCache(result)
        setData(result)
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [username])

  return { data, loading }
}
