import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { randomUUID } from 'crypto'

const ssm = new SSMClient({})
const dynamo = new DynamoDBClient({})
const SESSIONS_TABLE = process.env.ADMIN_SESSIONS_TABLE
const SESSION_TTL_SECONDS = 8 * 3600
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE
const MAX_ATTEMPTS_PER_IP = 5   // per window
const MAX_ATTEMPTS_GLOBAL = 50  // per window — caps attackers rotating IPs or spoofing headers
const RATE_LIMIT_WINDOW = 900   // seconds (15 minutes)

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

// Behind CloudFront, sourceIp is the edge server; the viewer arrives as "ip:port"
function clientIp(event) {
  const viewer = event.headers?.['cloudfront-viewer-address']
  if (viewer) return viewer.slice(0, viewer.lastIndexOf(':'))
  return event.requestContext?.http?.sourceIp ?? 'unknown'
}

// Atomically counts one attempt and returns the count in the current window.
// Counting before the password check means parallel requests can't slip past the limit.
async function countAttempt(key) {
  const now = Math.floor(Date.now() / 1000)
  try {
    const res = await dynamo.send(new UpdateItemCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { pk: { S: key } },
      UpdateExpression: 'ADD #c :one SET #t = if_not_exists(#t, :exp)',
      // DynamoDB TTL deletion lags, so an expired item must be treated as a fresh window
      ConditionExpression: 'attribute_not_exists(pk) OR #t > :now',
      ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
      ExpressionAttributeValues: {
        ':one': { N: '1' },
        ':exp': { N: String(now + RATE_LIMIT_WINDOW) },
        ':now': { N: String(now) },
      },
      ReturnValues: 'UPDATED_NEW',
    }))
    return Number(res.Attributes.count.N)
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err
    await dynamo.send(new PutItemCommand({
      TableName: RATE_LIMIT_TABLE,
      Item: { pk: { S: key }, count: { N: '1' }, ttl: { N: String(now + RATE_LIMIT_WINDOW) } },
    }))
    return 1
  }
}

async function isRateLimited(ip) {
  if (!RATE_LIMIT_TABLE) return false
  if (await countAttempt(`admin-auth#${ip}`) > MAX_ATTEMPTS_PER_IP) return true
  return await countAttempt('admin-auth#global') > MAX_ATTEMPTS_GLOBAL
}

async function resetAttempts(ip) {
  if (!RATE_LIMIT_TABLE) return
  await dynamo.send(new PutItemCommand({
    TableName: RATE_LIMIT_TABLE,
    Item: { pk: { S: `admin-auth#${ip}` }, count: { N: '0' }, ttl: { N: String(Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW) } },
  }))
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

  const ip = clientIp(event)
  if (await isRateLimited(ip)) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many attempts. Please try again in 15 minutes.' }) }
  }

  const secret = await getAdminSecret()
  if (!secret || password !== secret) {
    await new Promise(r => setTimeout(r, 500))
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid password' }) }
  }

  await resetAttempts(ip)

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
