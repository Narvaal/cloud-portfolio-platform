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

export function useGithubActivity(username: string) {
  const [data, setData] = useState<GithubActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}/events?per_page=30`),
          fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6&type=public`),
        ])

        const events = await eventsRes.json()
        const repos = await reposRes.json()

        const commits: GithubCommit[] = []
        for (const event of Array.isArray(events) ? events : []) {
          if (event.type === 'PushEvent') {
            for (const commit of event.payload?.commits ?? []) {
              commits.push({
                repo: (event.repo?.name as string ?? '').split('/')[1] ?? event.repo?.name,
                message: (commit.message as string).split('\n')[0],
                date: event.created_at as string,
                sha: (commit.sha as string).slice(0, 7),
              })
              if (commits.length >= 6) break
            }
          }
          if (commits.length >= 6) break
        }

        setData({
          commits,
          repos: (Array.isArray(repos) ? repos : []).slice(0, 4).map((r) => ({
            name: r.name as string,
            description: r.description as string | null,
            language: r.language as string | null,
            stars: r.stargazers_count as number,
            url: r.html_url as string,
          })),
        })
      } catch {
        // silent fail — panel will show empty state
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [username])

  return { data, loading }
}
