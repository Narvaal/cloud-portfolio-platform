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

const SKIP_REPOS = new Set(['build-your-own-x', 'awesome-electronics'])

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=8&type=public`,
        )
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

        // fetch latest 2 commits per repo in parallel
        const commitsByRepo = await Promise.all(
          repos.map(async (repo) => {
            const res = await fetch(
              `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=2`,
            )
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

        setData({ commits, repos })
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
