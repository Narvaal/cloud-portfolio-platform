import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { isAuthorized, UNAUTHORIZED } from './auth.mjs'

const dynamo = new DynamoDBClient({})
const TABLE  = process.env.SETTINGS_TABLE

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'

  if (method === 'GET') {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLE }))
    const settings = {}
    for (const item of result.Items ?? []) {
      const { key, value } = unmarshall(item)
      settings[key] = value
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(settings) }
  }

  if (method === 'PATCH') {
    if (!(await isAuthorized(event))) return UNAUTHORIZED
    const key = event.pathParameters?.key
    if (!key) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing key' }) }
    }
    const { value } = JSON.parse(event.body ?? '{}')
    if (value === undefined) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing value' }) }
    }
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { key: { S: decodeURIComponent(key) } },
      UpdateExpression: 'SET #val = :val',
      ExpressionAttributeNames:  { '#val': 'value' },
      ExpressionAttributeValues: { ':val': { S: String(value) } },
    }))
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
}
