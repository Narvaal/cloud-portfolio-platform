import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'

const ses = new SESClient({})
const dynamo = new DynamoDBClient({})
const CONTACT_EMAIL_DEFAULT = process.env.CONTACT_EMAIL
const CONTACTS_TABLE = process.env.CONTACTS_TABLE
const SETTINGS_TABLE = process.env.SETTINGS_TABLE
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE
const RATE_LIMIT_MAX = 3       // requests per window
const RATE_LIMIT_WINDOW = 3600 // seconds (1 hour)

async function getContactEmail() {
  if (!SETTINGS_TABLE) return CONTACT_EMAIL_DEFAULT
  try {
    const res = await dynamo.send(new GetItemCommand({
      TableName: SETTINGS_TABLE,
      Key: { key: { S: 'contact_email' } },
    }))
    return res.Item?.value?.S || CONTACT_EMAIL_DEFAULT
  } catch {
    return CONTACT_EMAIL_DEFAULT
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
}

function formatTime(seconds) {
  if (!seconds || seconds < 5) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function parseDevice(ua) {
  if (!ua) return null
  const mobile = /mobile|android|iphone|ipad/i.test(ua)
  const os =
    /windows/i.test(ua) ? 'Windows' :
    /mac os x/i.test(ua) ? (/iphone|ipad/i.test(ua) ? 'iOS' : 'macOS') :
    /android/i.test(ua) ? 'Android' :
    /linux/i.test(ua) ? 'Linux' : null
  const browser =
    /edg\//i.test(ua) ? 'Edge' :
    /opr\//i.test(ua) ? 'Opera' :
    /chrome/i.test(ua) ? 'Chrome' :
    /firefox/i.test(ua) ? 'Firefox' :
    /safari/i.test(ua) ? 'Safari' : null
  const parts = [mobile ? 'Mobile' : 'Desktop', os, browser].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function formatReferrer(ref) {
  if (!ref || ref === 'direct') return 'Direct'
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '')
    if (host.includes('google')) return `Google (${host})`
    if (host.includes('linkedin')) return 'LinkedIn'
    if (host.includes('github')) return 'GitHub'
    return host
  } catch {
    return ref
  }
}

function buildHtml({ name, email, message, timeOnSite, timezone, locale, country, ip, device, referrer }) {
  const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')
  const time = formatTime(timeOnSite)

  const row = (label, value) =>
    value ? `<tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:120px;vertical-align:top">${label}</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${value}</td></tr>` : ''

  const metaRows = [
    row('Referrer', referrer ? formatReferrer(referrer) : null),
    row('Dispositivo', device),
    row('Timezone', timezone),
    row('Locale', locale),
    row('Tempo no site', time),
    row('País', country),
    row('IP', ip),
  ].join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

        <tr>
          <td style="background:#09090b;padding:28px 32px">
            <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#22d3ee">Portfolio · Alessandro Bezerra da Silva</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff">Hey Alessandro, você recebeu uma mensagem 👋</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="padding-bottom:20px;border-bottom:1px solid #e4e4e7">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">De</p>
                  <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#09090b">${name}</p>
                  <a href="mailto:${email}" style="font-size:14px;color:#22d3ee;text-decoration:none">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding-top:24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">Mensagem</p>
                  <p style="margin:0;font-size:15px;line-height:1.8;color:#3f3f46">${safeMessage}</p>
                </td>
              </tr>
            </table>

            ${metaRows ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px 20px">
              <tr><td colspan="2" style="padding-bottom:10px">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">Sobre o visitante</p>
              </td></tr>
              ${metaRows}
            </table>` : ''}
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
            <p style="margin:0;font-size:12px;color:#a1a1aa">Responda este email para falar diretamente com ${name}.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildText({ name, email, message, timeOnSite, timezone, locale, country, ip, device, referrer }) {
  const time = formatTime(timeOnSite)
  const meta = [
    referrer  && `Referrer:     ${formatReferrer(referrer)}`,
    device    && `Dispositivo:  ${device}`,
    timezone  && `Timezone:     ${timezone}`,
    locale    && `Locale:       ${locale}`,
    time      && `Tempo no site:${time}`,
    country   && `País:         ${country}`,
    ip        && `IP:           ${ip}`,
  ].filter(Boolean).join('\n')

  return [`Hey Alessandro!\n`, `De: ${name} <${email}>\n`, message, meta ? `\n${'─'.repeat(40)}\nSobre o visitante\n${meta}` : ''].join('\n')
}

async function checkRateLimit(ip) {
  if (!RATE_LIMIT_TABLE || !ip) return false
  const now = Math.floor(Date.now() / 1000)
  const key = `contact#${ip}`
  const existing = await dynamo.send(new GetItemCommand({
    TableName: RATE_LIMIT_TABLE,
    Key: { pk: { S: key } },
  }))
  if (existing.Item) {
    const expiry = Number(existing.Item.ttl?.N ?? 0)
    const count  = Number(existing.Item.count?.N ?? 0)
    if (now < expiry && count >= RATE_LIMIT_MAX) return true
    if (now < expiry) {
      await dynamo.send(new UpdateItemCommand({
        TableName: RATE_LIMIT_TABLE,
        Key: { pk: { S: key } },
        UpdateExpression: 'ADD #c :inc',
        ExpressionAttributeNames: { '#c': 'count' },
        ExpressionAttributeValues: { ':inc': { N: '1' } },
      }))
    } else {
      await dynamo.send(new PutItemCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: { pk: { S: key }, count: { N: '1' }, ttl: { N: String(now + RATE_LIMIT_WINDOW) } },
      }))
    }
  } else {
    await dynamo.send(new PutItemCommand({
      TableName: RATE_LIMIT_TABLE,
      Item: { pk: { S: key }, count: { N: '1' }, ttl: { N: String(now + RATE_LIMIT_WINDOW) } },
    }))
  }
  return false
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body ?? '{}')
    const { name, email, message, timeOnSite, timezone, locale, referrer } = body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    if (name.trim().length > 100) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Name too long (max 100 characters)' }) }
    }
    if (email.trim().length > 254 || !EMAIL_REGEX.test(email.trim())) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid email address' }) }
    }
    if (message.trim().length > 2000) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Message too long (max 2000 characters)' }) }
    }

    const ip = event.requestContext?.http?.sourceIp ?? null
    const rateLimited = await checkRateLimit(ip)
    if (rateLimited) {
      return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many requests. Please try again in an hour.' }) }
    }

    const country = event.headers?.['cloudfront-viewer-country'] ?? null
    const device  = parseDevice(event.headers?.['user-agent'])

    const data = { name, email, message, timeOnSite, timezone, locale, referrer, country, ip, device }

    const CONTACT_EMAIL = await getContactEmail()

    await ses.send(new SendEmailCommand({
      Source: `Alessandro Bezerra da Silva <${CONTACT_EMAIL}>`,
      Destination: { ToAddresses: [CONTACT_EMAIL] },
      ReplyToAddresses: [`${name} <${email}>`],
      Message: {
        Subject: {
          Data: `[Portfolio] ${name} — ${message.slice(0, 55).trim()}${message.length > 55 ? '…' : ''}`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: { Data: buildText(data), Charset: 'UTF-8' },
          Html: { Data: buildHtml(data), Charset: 'UTF-8' },
        },
      },
    }))

    if (CONTACTS_TABLE) {
      try {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        await dynamo.send(new PutItemCommand({
          TableName: CONTACTS_TABLE,
          Item: {
            id:         { S: id },
            name:       { S: name },
            email:      { S: email },
            message:    { S: message },
            referrer:   referrer             ? { S: referrer }              : { NULL: true },
            device:     device               ? { S: device }                : { NULL: true },
            timezone:   timezone             ? { S: timezone }              : { NULL: true },
            locale:     locale               ? { S: locale }                : { NULL: true },
            timeOnSite: timeOnSite != null   ? { N: String(timeOnSite) }   : { NULL: true },
            country:    country              ? { S: country }               : { NULL: true },
            ip:         ip                   ? { S: ip }                    : { NULL: true },
            receivedAt: { S: new Date().toISOString() },
          },
        }))
      } catch (dbErr) {
        console.error('DynamoDB save failed:', dbErr)
      }
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to send message' }) }
  }
}
