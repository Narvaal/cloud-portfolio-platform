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
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

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

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(() => readCache())
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    if (readCache()) return // still fresh, skip fetch

    async function load() {
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=8&type=public`,
        )
        if (!reposRes.ok) return // rate limited or error — keep showing cached/empty
        const rawRepos = await reposRes.json()

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

        const commitsByRepo = await Promise.all(
          repos.map(async (repo) => {
            const res = await fetch(
              `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=2`,
            )
            if (!res.ok) return []
            const raw = await res.json()
            return (Array.isArray(raw) ? raw : []).map((c: { sha: string; commit: { message: string; author: { date: string } } }) => ({
              repo: repo.name,
              message: c.commit.message.split('\n')[0],
              date: c.commit.author.date,
              sha: c.sha.slice(0, 7),
            }))
          }),
        )

        const commits: GithubCommit[] = commitsByRepo
          .flat()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 6)

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
