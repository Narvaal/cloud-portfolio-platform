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

interface RawRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
}

interface PushEvent {
  type: string
  repo: { name: string }
  created_at: string
  payload: {
    commits?: { sha: string; message: string }[]
  }
}

async function fetchCommitsViaEvents(username: string): Promise<GithubCommit[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/events?per_page=100`,
    { headers: githubHeaders() },
  )
  if (!res.ok) return []
  const raw: PushEvent[] = await res.json()
  return (Array.isArray(raw) ? raw : [])
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
}

async function fetchCommitsPerRepo(username: string, repos: GithubRepo[]): Promise<GithubCommit[]> {
  const commitsByRepo = await Promise.all(
    repos.map(async (repo) => {
      const res = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=2`,
        { headers: githubHeaders() },
      )
      if (!res.ok) return []
      const raw = await res.json()
      return (Array.isArray(raw) ? raw : []).map(
        (c: { sha: string; commit: { message: string; author: { date: string } } }) => ({
          repo: repo.name,
          message: c.commit.message.split('\n')[0],
          date: c.commit.author.date,
          sha: c.sha.slice(0, 7),
        }),
      )
    }),
  )
  return commitsByRepo
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
}

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(() => readCache())
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    if (readCache()) return

    async function load() {
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=8&type=public`,
          { headers: githubHeaders() },
        )
        if (!reposRes.ok) return

        const rawRepos = await reposRes.json()
        const repos: GithubRepo[] = (Array.isArray(rawRepos) ? rawRepos : [])
          .filter((r: RawRepo) => !SKIP_REPOS.has(r.name))
          .slice(0, 4)
          .map((r: RawRepo) => ({
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            url: r.html_url,
          }))

        // Try Events API first (captures all branches); fall back to per-repo commits
        let commits = await fetchCommitsViaEvents(username)
        if (commits.length === 0) {
          commits = await fetchCommitsPerRepo(username, repos)
        }

        const result = { commits, repos }
        writeCache(result)
        setData(result)
      } catch {
        // silent fail — keeps whatever was in state (null or stale cache)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [username])

  return { data, loading }
}
