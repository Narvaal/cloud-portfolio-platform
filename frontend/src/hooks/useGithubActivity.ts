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

function githubFetchOptions(): RequestInit {
  return {
    cache: 'no-store',
    headers: GITHUB_TOKEN
      ? { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
      : { Accept: 'application/vnd.github+json' },
  }
}

interface RawRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
}

interface SearchCommitItem {
  sha: string
  commit: { message: string; committer: { date: string } }
  repository: { name: string }
}

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(() => readCache())
  const [loading, setLoading] = useState(() => readCache() === null)

  useEffect(() => {
    if (readCache()) return

    async function load() {
      try {
        const repoType = GITHUB_TOKEN ? 'all' : 'public'

        const [searchRes, reposRes] = await Promise.all([
          fetch(
            `https://api.github.com/search/commits?q=author:${username}&sort=committer-date&order=desc&per_page=10`,
            githubFetchOptions(),
          ),
          fetch(
            `https://api.github.com/users/${username}/repos?sort=updated&per_page=8&type=${repoType}`,
            githubFetchOptions(),
          ),
        ])

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

        let commits: GithubCommit[] = []

        if (searchRes.ok) {
          const searchData = await searchRes.json()
          commits = ((searchData.items ?? []) as SearchCommitItem[])
            .filter(item => !SKIP_REPOS.has(item.repository.name))
            .filter(item => !item.commit.message.startsWith('Merge ') && !item.commit.message.toLowerCase().startsWith('merge:'))
            .slice(0, 6)
            .map(item => ({
              repo: item.repository.name,
              message: item.commit.message.split('\n')[0],
              date: item.commit.committer.date,
              sha: item.sha.slice(0, 7),
            }))
        }

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
