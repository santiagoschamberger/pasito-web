import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const TICKET_VERSION = 'pt1'
const PASITOS_CLAIM_VERSION = 'pp1'
const SESSION_VERSION = 'pcs1'
export const TOMATE_CHECKIN_COOKIE = 'tomate_checkin_session'

function secret(): string {
  const value = process.env.EVENT_TICKET_SIGNING_SECRET
  if (!value || value.length < 32) throw new Error('Falta EVENT_TICKET_SIGNING_SECRET seguro.')
  return value
}

function signature(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function createTicketToken(ticketId: string): string {
  const payload = `${TICKET_VERSION}.${ticketId}`
  return `${payload}.${signature(payload)}`
}

export function readTicketToken(value: string): string | null {
  const parts = value.trim().split('.')
  if (parts.length !== 3 || parts[0] !== TICKET_VERSION) return null
  const payload = `${parts[0]}.${parts[1]}`
  if (!safeEqual(signature(payload), parts[2])) return null
  return /^[0-9a-f-]{36}$/i.test(parts[1]) ? parts[1] : null
}

export function createPasitosClaimToken(orderId: string): string {
  const payload = `${PASITOS_CLAIM_VERSION}.${orderId}`
  return `${payload}.${signature(payload)}`
}

export function readPasitosClaimToken(value: string): string | null {
  const parts = value.trim().split('.')
  if (parts.length !== 3 || parts[0] !== PASITOS_CLAIM_VERSION) return null
  const payload = `${parts[0]}.${parts[1]}`
  if (!safeEqual(signature(payload), parts[2])) return null
  return /^[0-9a-f-]{36}$/i.test(parts[1]) ? parts[1] : null
}

export function extractTicketToken(value: string): string | null {
  const trimmed = value.trim()
  const direct = readTicketToken(trimmed)
  if (direct) return trimmed
  try {
    const url = new URL(trimmed)
    const token = url.pathname.split('/').filter(Boolean).at(-1) ?? ''
    return readTicketToken(token) ? token : null
  } catch {
    return null
  }
}

export function createIntentToken(intentId: string): string {
  const payload = `intent.${intentId}`
  return `${payload}.${signature(payload)}`
}

export function readIntentToken(value: string): string | null {
  const parts = value.trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'intent') return null
  const payload = `${parts[0]}.${parts[1]}`
  if (!safeEqual(signature(payload), parts[2])) return null
  return /^[0-9a-f-]{36}$/i.test(parts[1]) ? parts[1] : null
}

export type CheckinSession = { operator: string; expiresAt: number }

export function createCheckinSession(operator: string, lifetimeSeconds = 12 * 60 * 60): string {
  const data: CheckinSession = {
    operator: operator.trim().slice(0, 80),
    expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url')
  const payload = `${SESSION_VERSION}.${encoded}`
  return `${payload}.${signature(payload)}`
}

export function readCheckinSession(value: string | undefined): CheckinSession | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 3 || parts[0] !== SESSION_VERSION) return null
  const payload = `${parts[0]}.${parts[1]}`
  if (!safeEqual(signature(payload), parts[2])) return null
  try {
    const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as CheckinSession
    if (!data.operator || !Number.isInteger(data.expiresAt)) return null
    if (data.expiresAt <= Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.EVENT_CHECKIN_PASSWORD
  if (!expected || expected.length < 10) throw new Error('Falta EVENT_CHECKIN_PASSWORD seguro.')
  return safeEqual(signature(`password.${candidate}`), signature(`password.${expected}`))
}
