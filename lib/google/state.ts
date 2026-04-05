import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.GOOGLE_OAUTH_STATE_SECRET || 'dev-secret-change-me'

interface StatePayload {
  userId: string
  returnPath?: string
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function createStateToken(payload: StatePayload): string {
  const json = JSON.stringify(payload)
  const signature = sign(json)
  return Buffer.from(JSON.stringify({ payload: json, signature })).toString('base64url')
}

export function verifyStateToken(stateParam: string): StatePayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    const expectedSig = sign(decoded.payload)

    const sigBuffer = Buffer.from(decoded.signature, 'base64url')
    const expectedBuffer = Buffer.from(expectedSig, 'base64url')

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null
    }

    return JSON.parse(decoded.payload) as StatePayload
  } catch {
    return null
  }
}
