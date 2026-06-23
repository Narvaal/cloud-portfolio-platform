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

const CACHE_KEY = 'github_activity_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const SKIP_REPOS = new Set(['build-your-own-x', 'awesome-electronics'])
const MERGE_MSG = /^(Merge (pull request|branch|remote-tracking)|merge:)/i

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

interface RawCommit {
  sha: string
  commit: { message: string; author: { date: string } }
}

interface SearchCommitItem {
  sha: string
  commit: { message: string; committer: { date: string } }
  repository: { name: string }
}

async function fetchFreshCommits(username: string, repoName: string): Promise<GithubCommit[]> {
  // Try dev branch first (active work branch), fall back to default
  for (const branch of ['dev', 'HEAD']) {
    const res = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/commits?sha=${branch}&per_page=3`,
      githubFetchOptions(),
    )
    if (!res.ok) continue
    const raw: RawCommit[] = await res.json()
    if (!Array.isArray(raw) || raw.length === 0) continue
    return raw.map(c => ({
      repo: repoName,
      message: c.commit.message.split('\n')[0],
      date: c.commit.author.date,
      sha: c.sha.slice(0, 7),
      url: `https://github.com/${username}/${repoName}/commit/${c.sha}`,
    }))
  }
  return []
}

async function fetchSearchCommits(username: string): Promise<GithubCommit[]> {
  const res = await fetch(
    `https://api.github.com/search/commits?q=author:${username}&sort=committer-date&order=desc&per_page=20`,
    githubFetchOptions(),
  )
  if (!res.ok) return []
  const data = await res.json()
  return ((data.items ?? []) as SearchCommitItem[])
    .filter(item => !SKIP_REPOS.has(item.repository.name) && !MERGE_MSG.test(item.commit.message))
    .map(item => ({
      repo: item.repository.name,
      message: item.commit.message.split('\n')[0],
      date: item.commit.committer.date,
      sha: item.sha.slice(0, 7),
      url: `https://github.com/${username}/${item.repository.name}/commit/${item.sha}`,
    }))
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
          githubFetchOptions(),
        )
        if (!reposRes.ok) return

        const rawRepos = await reposRes.json()
        const repos: GithubRepo[] = (Array.isArray(rawRepos) ? rawRepos : [])
          .filter((r: RawRepo) => !SKIP_REPOS.has(r.name))
          .slice(0, 3)
          .map((r: RawRepo) => ({
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            url: r.html_url,
          }))

        // Fetch fresh commits per-repo (real-time) + search (broad but delayed)
        const [freshByRepo, searchCommits] = await Promise.all([
          Promise.all(repos.map(r => fetchFreshCommits(username, r.name))),
          fetchSearchCommits(username),
        ])

        // Merge, deduplicate by sha, sort newest-first, take 6
        const allCommits = [...freshByRepo.flat(), ...searchCommits]
        const seen = new Set<string>()
        const commits = allCommits
          .filter(c => {
            if (seen.has(c.sha) || MERGE_MSG.test(c.message)) return false
            seen.add(c.sha)
            return true
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3)

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
