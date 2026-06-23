import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'

const s3 = new S3Client({})
const cf = new CloudFrontClient({ region: 'us-east-1' })

const BUCKET          = process.env.S3_BUCKET
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID
const PREFIX          = 'showcase/video/'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'
  const path   = event.rawPath ?? ''

  // GET /video/list
  if (method === 'GET' && path === '/video/list') {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }))
    const files = (res.Contents ?? [])
      .map(o => o.Key.replace(PREFIX, ''))
      .filter(f => f.endsWith('.mp4'))
      .sort()
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ files }) }
  }

  // GET /video/presign?filename=xxx.mp4
  if (method === 'GET' && path === '/video/presign') {
    const filename = event.queryStringParameters?.filename
    if (!filename || !filename.endsWith('.mp4')) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'filename (.mp4) required' }) }
    }
    const url = await getSignedUrl(s3, new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${PREFIX}${filename}`,
      ContentType: 'video/mp4',
    }), { expiresIn: 300 })
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ uploadUrl: url }) }
  }

  // POST /video/publish
  if (method === 'POST' && path === '/video/publish') {
    await cf.send(new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `video-${Date.now()}`,
        Paths: { Quantity: 1, Items: ['/showcase/video/*'] },
      },
    }))
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  }

  return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'not found' }) }
}
