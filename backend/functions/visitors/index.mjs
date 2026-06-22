import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb'

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

async function getTotal() {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { pk: { S: 'TOTAL' } },
  }))
  return result.Item?.count?.N ? parseInt(result.Item.count.N) : 0
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
    const count = await getTotal()
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ count }),
    }
  }

  return {
    statusCode: 405,
    headers: CORS,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  }
}
