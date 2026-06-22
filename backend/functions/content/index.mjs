import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const dynamo = new DynamoDBClient({})
const TABLE = process.env.CONTENT_TABLE

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'

  if (method === 'GET') {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLE }))
    const out = {}
    for (const raw of result.Items ?? []) {
      const { type, lang, data } = unmarshall(raw)
      if (!out[type]) out[type] = {}
      try {
        out[type][lang] = JSON.parse(data)
      } catch {
        out[type][lang] = data
      }
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(out) }
  }

  if (method === 'PUT') {
    const type = event.pathParameters?.type
    const lang = event.queryStringParameters?.lang
    if (!type || !lang) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing type or lang' }) }
    }
    const rawBody = event.body ?? '{}'
    try {
      JSON.parse(rawBody)
    } catch {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }
    await dynamo.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        type: { S: decodeURIComponent(type) },
        lang: { S: lang },
        data: { S: rawBody },
      },
    }))
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
}
