import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({})
const CONTACT_EMAIL = process.env.CONTACT_EMAIL

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

function buildHtml({ name, email, message, timeOnSite, timezone, locale, country, ip }) {
  const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')
  const time = formatTime(timeOnSite)

  const metaItems = [
    timezone && `<tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:110px">Timezone</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${timezone}</td></tr>`,
    locale   && `<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Locale</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${locale}</td></tr>`,
    time     && `<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Time on site</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${time}</td></tr>`,
    country  && `<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Country</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${country}</td></tr>`,
    ip       && `<tr><td style="padding:6px 0;color:#71717a;font-size:13px">IP</td><td style="padding:6px 0;font-size:13px;color:#3f3f46">${ip}</td></tr>`,
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="en">
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

            ${metaItems ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px 20px">
              <tr><td colspan="2" style="padding-bottom:10px">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">Sobre o visitante</p>
              </td></tr>
              ${metaItems}
            </table>` : ''}

          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
            <p style="margin:0;font-size:12px;color:#a1a1aa">
              Responda este email para falar diretamente com ${name}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildText({ name, email, message, timeOnSite, timezone, locale, country, ip }) {
  const time = formatTime(timeOnSite)
  const meta = [
    timezone && `Timezone:     ${timezone}`,
    locale   && `Locale:       ${locale}`,
    time     && `Time on site: ${time}`,
    country  && `Country:      ${country}`,
    ip       && `IP:           ${ip}`,
  ].filter(Boolean).join('\n')

  return [
    `Hey Alessandro, você recebeu uma mensagem!\n`,
    `De: ${name} <${email}>\n`,
    message,
    meta ? `\n${'─'.repeat(40)}\nSobre o visitante\n${meta}` : '',
  ].join('\n')
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body ?? '{}')
    const { name, email, message, timeOnSite, timezone, locale } = body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    const country = event.headers?.['cloudfront-viewer-country'] ?? null
    const ip = event.requestContext?.http?.sourceIp ?? null

    const data = { name, email, message, timeOnSite, timezone, locale, country, ip }

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

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to send message' }) }
  }
}
