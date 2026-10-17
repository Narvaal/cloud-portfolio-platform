import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient({})

const USERNAME = process.env.GITHUB_USERNAME
const TOKEN_PARAM = process.env.GITHUB_TOKEN_PARAM
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const SKIP_REPOS = new Set(['build-your-own-x', 'awesome-electronics'])
const MERGE_MSG = /^(Merge (pull request|branch|remote-tracking)|merge:)/i

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
}

// Module-scope caches survive across warm invocations
let token
let cached = null

async function getToken() {
  if (token !== undefined) return token
  try {
    const { Parameter } = await ssm.send(new GetParameterCommand({
      Name: TOKEN_PARAM,
      WithDecryption: true,
    }))
    token = Parameter?.Value ?? null
  } catch {
    // Parameter missing — fall back to unauthenticated requests (60 req/h)
    token = null
  }
  return token
}

async function gh(path) {
  const t = await getToken()
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  })
  if (!res.ok) return null
  return res.json()
}

async function fetchFreshCommits(repoName) {
  // Try dev branch first (active work branch), fall back to default
  for (const branch of ['dev', 'HEAD']) {
    const raw = await gh(`/repos/${USERNAME}/${repoName}/commits?sha=${branch}&per_page=3`)
    if (!Array.isArray(raw) || raw.length === 0) continue
    return raw.map((c) => ({
      repo: repoName,
      message: c.commit.message.split('\n')[0],
      date: c.commit.author.date,
      sha: c.sha.slice(0, 7),
      url: `https://github.com/${USERNAME}/${repoName}/commit/${c.sha}`,
    }))
  }
  return []
}

async function fetchSearchCommits() {
  const data = await gh(`/search/commits?q=author:${USERNAME}&sort=committer-date&order=desc&per_page=20`)
  return (data?.items ?? [])
    .filter((item) => !SKIP_REPOS.has(item.repository.name) && !MERGE_MSG.test(item.commit.message))
    .map((item) => ({
      repo: item.repository.name,
      message: item.commit.message.split('\n')[0],
      date: item.commit.committer.date,
      sha: item.sha.slice(0, 7),
      url: `https://github.com/${USERNAME}/${item.repository.name}/commit/${item.sha}`,
    }))
}

async function loadActivity() {
  const rawRepos = await gh(`/users/${USERNAME}/repos?sort=updated&per_page=8&type=public`)
  if (!Array.isArray(rawRepos)) return null

  const repos = rawRepos
    .filter((r) => !SKIP_REPOS.has(r.name))
    .slice(0, 3)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
    }))

  // Fresh commits per-repo (real-time) + search (broad but delayed)
  const [freshByRepo, searchCommits] = await Promise.all([
    Promise.all(repos.map((r) => fetchFreshCommits(r.name))),
    fetchSearchCommits(),
  ])

  // Merge, deduplicate by sha, sort newest-first
  const seen = new Set()
  const commits = [...freshByRepo.flat(), ...searchCommits]
    .filter((c) => {
      if (seen.has(c.sha) || MERGE_MSG.test(c.message)) return false
      seen.add(c.sha)
      return true
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  return { commits, repos }
}

export const handler = async () => {
  if (!cached || Date.now() - cached.ts > CACHE_TTL) {
    const data = await loadActivity()
    if (data) cached = { data, ts: Date.now() }
  }

  if (!cached) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'GitHub unavailable' }) }
  }

  return {
    statusCode: 200,
    headers: { ...CORS, 'Cache-Control': 'public, max-age=300' },
    body: JSON.stringify(cached.data),
  }
}
