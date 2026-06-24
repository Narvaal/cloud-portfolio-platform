import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { randomUUID } from 'crypto'

const ssm = new SSMClient({})
const dynamo = new DynamoDBClient({})
const SESSIONS_TABLE = process.env.ADMIN_SESSIONS_TABLE
const SESSION_TTL_SECONDS = 8 * 3600

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
}

let cachedSecret = null
let cacheExpiry = 0

async function getAdminSecret() {
  if (cachedSecret && Date.now() < cacheExpiry) return cachedSecret
  const result = await ssm.send(new GetParameterCommand({
    Name: '/portfolio/admin-secret',
    WithDecryption: true,
  }))
  cachedSecret = result.Parameter?.Value ?? null
  cacheExpiry = Date.now() + 5 * 60 * 1000
  return cachedSecret
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? ''

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS }
  if (method !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  let password
  try {
    ;({ password } = JSON.parse(event.body ?? '{}'))
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  if (!password) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password required' }) }
  }

  const secret = await getAdminSecret()
  if (!secret || password !== secret) {
    await new Promise(r => setTimeout(r, 500))
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid password' }) }
  }

  const token = randomUUID()
  const ttl = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS

  await dynamo.send(new PutItemCommand({
    TableName: SESSIONS_TABLE,
    Item: {
      token: { S: token },
      ttl:   { N: String(ttl) },
    },
  }))

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ token }) }
}
