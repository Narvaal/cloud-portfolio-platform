import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'

const s3 = new S3Client({})
const cf = new CloudFrontClient({ region: 'us-east-1' })

const BUCKET          = process.env.S3_BUCKET
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID
const FILENAME        = 'Alessandro_Bezerra_Java_Backend_Engineer.pdf'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'
  const lang   = event.queryStringParameters?.lang ?? 'en'
  const key    = `resume/${lang}/${FILENAME}`

  if (method === 'GET') {
    const command = new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      ContentType: 'application/pdf',
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ uploadUrl }),
    }
  }

  if (method === 'POST') {
    await cf.send(new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `resume-${Date.now()}`,
        Paths: { Quantity: 1, Items: ['/resume/*'] },
      },
    }))
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true }),
    }
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
}
