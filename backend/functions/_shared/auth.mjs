import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'

const dynamo = new DynamoDBClient({})

export async function isAuthorized(event) {
  const table = process.env.ADMIN_SESSIONS_TABLE
  if (!table) return false
  const raw = event.headers?.authorization ?? event.headers?.Authorization ?? ''
  const auth = raw.trim()
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice(7).trim()
  if (!token) return false
  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: table,
      Key: { token: { S: token } },
    }))
    if (!result.Item) return false
    return Math.floor(Date.now() / 1000) < Number(result.Item.ttl?.N ?? 0)
  } catch {
    return false
  }
}

export const UNAUTHORIZED = {
  statusCode: 401,
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'Unauthorized' }),
}
