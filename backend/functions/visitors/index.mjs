import { DynamoDBClient, UpdateItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const ddb = new DynamoDBClient({})
const TABLE = process.env.VISITORS_TABLE

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

async function increment(pk) {
  const result = await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { pk: { S: pk } },
    UpdateExpression: 'ADD #count :inc',
    ExpressionAttributeNames: { '#count': 'count' },
    ExpressionAttributeValues: { ':inc': { N: '1' } },
    ReturnValues: 'UPDATED_NEW',
  }))
  return parseInt(result.Attributes.count.N)
}

async function getStats() {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE }))
  const items = (result.Items ?? []).map((item) => unmarshall(item))

  const count = items.find((i) => i.pk === 'TOTAL')?.count ?? 0
  const countries = items
    .filter((i) => i.pk.startsWith('COUNTRY#'))
    .map((i) => ({ code: i.pk.replace('COUNTRY#', ''), count: i.count }))
    .sort((a, b) => b.count - a.count)

  return { count, countries }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'

  if (method === 'POST') {
    const country = event.headers?.['cloudfront-viewer-country']

    const [total] = await Promise.all([
      increment('TOTAL'),
      country ? increment(`COUNTRY#${country}`) : Promise.resolve(),
    ])

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ count: total }),
    }
  }

  if (method === 'GET') {
    const stats = await getStats()
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(stats),
    }
  }

  return {
    statusCode: 405,
    headers: CORS,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  }
}
