import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({})
const CONTACT_EMAIL = process.env.CONTACT_EMAIL

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
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
      Source: `Portfolio Contact <${CONTACT_EMAIL}>`,
      Destination: { ToAddresses: [CONTACT_EMAIL] },
      ReplyToAddresses: [email],
      Message: {
        Subject: {
          Data: `Portfolio contact from ${name}`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `Name: ${name}\nEmail: ${email}\n\n${message}`,
            Charset: 'UTF-8',
          },
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
