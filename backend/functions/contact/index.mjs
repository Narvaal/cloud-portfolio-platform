import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({})
const CONTACT_EMAIL = process.env.CONTACT_EMAIL

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
}

function buildHtml(name, email, message) {
  const safeMessage = message.replace(/\n/g, '<br>')
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

        <tr>
          <td style="background:#09090b;padding:28px 32px">
            <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#22d3ee">Portfolio</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff">New message received</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:24px;border-bottom:1px solid #e4e4e7">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">From</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#09090b">${name}</p>
                  <a href="mailto:${email}" style="font-size:14px;color:#22d3ee;text-decoration:none">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding-top:24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">Message</p>
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46">${safeMessage}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
            <p style="margin:0;font-size:12px;color:#a1a1aa">
              Reply directly to this email to respond to ${name}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildText(name, email, message) {
  return `New portfolio contact\n${'─'.repeat(40)}\nFrom: ${name} <${email}>\n\n${message}\n\n${'─'.repeat(40)}\nReply to this email to respond.`
}

export const handler = async (event) => {
  try {
    const { name, email, message } = JSON.parse(event.body ?? '{}')

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Missing required fields' }),
      }
    }

    await ses.send(new SendEmailCommand({
      Source: `Alessandro Bezerra Portfolio <${CONTACT_EMAIL}>`,
      Destination: { ToAddresses: [CONTACT_EMAIL] },
      ReplyToAddresses: [`${name} <${email}>`],
      Message: {
        Subject: {
          Data: `[Portfolio] ${name} — ${message.slice(0, 60).trim()}${message.length > 60 ? '…' : ''}`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: { Data: buildText(name, email, message), Charset: 'UTF-8' },
          Html: { Data: buildHtml(name, email, message), Charset: 'UTF-8' },
        },
      },
    }))

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true }),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to send message' }),
    }
  }
}
