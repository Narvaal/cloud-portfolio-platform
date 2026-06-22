import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'

const dynamo = new DynamoDBClient({})
const CONTACTS_TABLE = process.env.CONTACTS_TABLE

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  const id = event.pathParameters?.id
  if (!id) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing id' }) }
  }

  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: CONTACTS_TABLE,
      Key: { id: { S: decodeURIComponent(id) } },
      UpdateExpression: 'SET #read = :true',
      ExpressionAttributeNames: { '#read': 'read' },
      ExpressionAttributeValues: { ':true': { BOOL: true } },
    }))
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to update contact' }) }
  }
}
