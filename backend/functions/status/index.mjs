import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient({})

const PARAMS = [
  '/portfolio/version',
  '/portfolio/last-deploy',
  '/portfolio/last-commit-sha',
  '/portfolio/last-commit-message',
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async () => {
  const { Parameters = [] } = await ssm.send(
    new GetParametersCommand({ Names: PARAMS }),
  )

  const get = (name) => Parameters.find((p) => p.Name === name)?.Value ?? null

  const sha = get('/portfolio/last-commit-sha')
  const message = get('/portfolio/last-commit-message')

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      api: 'online',
      frontend: 'online',
      version: get('/portfolio/version') ?? 'unknown',
      lastDeploy: get('/portfolio/last-deploy') ?? new Date().toISOString(),
      ...(sha && message ? { lastCommit: { sha, message } } : {}),
    }),
  }
}
