import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const dynamo = new DynamoDBClient({})
const CONTACTS_TABLE = process.env.CONTACTS_TABLE

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async () => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: CONTACTS_TABLE }))
    const items = (result.Items ?? [])
      .map((item) => unmarshall(item))
      .sort((a, b) => b.id.localeCompare(a.id))
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ items }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to fetch contacts' }) }
  }
}
