import { createHmac, randomInt, randomUUID } from 'node:crypto'

import { normalizePasito50SupportId } from './pasito50.ts'

const CHALLENGE_TTL_MS = 10 * 60 * 1_000

export function pasito50CodeHash(params: {
  challengeId: string
  code: string
  supportId: string
  secret: string
}): string {
  return createHmac('sha256', params.secret)
    .update(`pasito50:${params.challengeId}:${normalizePasito50SupportId(params.supportId)}:${params.code}`)
    .digest('hex')
}

export function createPasito50Verification(params: {
  supportId: string
  secret: string
  now?: Date
}): {
  challengeId: string
  code: string
  codeHash: string
  expiresAt: Date
} {
  const challengeId = randomUUID()
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const expiresAt = new Date((params.now ?? new Date()).getTime() + CHALLENGE_TTL_MS)
  return {
    challengeId,
    code,
    codeHash: pasito50CodeHash({
      challengeId,
      code,
      supportId: params.supportId,
      secret: params.secret,
    }),
    expiresAt,
  }
}

export function getPasito50SigningSecret(): string {
  const secret = process.env.PASITO_PROMO_SIGNING_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('Falta PASITO_PROMO_SIGNING_SECRET de al menos 32 caracteres.')
  }
  return secret
}
