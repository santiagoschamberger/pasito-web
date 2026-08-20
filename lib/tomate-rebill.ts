import 'server-only'

const REBILL_API = 'https://api.rebill.com/v3'

export type RebillPayment = {
  id?: string
  status?: string
  amount?: number | string
  currency?: string
  installments?: number | null
  metadata?: Record<string, unknown>
  customer?: {
    email?: string
    firstName?: string
    lastName?: string
  }
}

function getRebillSecretKeys() {
  const primaryKey = process.env.REBILL_SECRET_KEY?.trim()
  if (!primaryKey) throw new Error('Falta REBILL_SECRET_KEY.')

  const legacyKey = process.env.REBILL_LEGACY_SECRET_KEY?.trim()
  return [...new Set([primaryKey, legacyKey].filter((value): value is string => Boolean(value)))]
}

export async function getRebillPayment(paymentId: string): Promise<RebillPayment> {
  const secretKeys = getRebillSecretKeys()
  let lastStatus = 500

  for (let index = 0; index < secretKeys.length; index += 1) {
    const response = await fetch(`${REBILL_API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 'x-api-key': secretKeys[index] },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    lastStatus = response.status

    if (response.ok) return response.json() as Promise<RebillPayment>

    const canTryLegacyAccount = response.status === 404 && index < secretKeys.length - 1
    if (!canTryLegacyAccount) break
  }

  throw new Error(`Rebill respondió ${lastStatus}.`)
}

export function rebillCustomerName(payment: RebillPayment): string | null {
  return [payment.customer?.firstName, payment.customer?.lastName].filter(Boolean).join(' ').trim() || null
}

export function normalizeRebillStatus(status: string | undefined):
  | 'approved'
  | 'refunded'
  | 'cancelled'
  | 'chargeback'
  | 'disputed'
  | null {
  const normalized = status?.toLowerCase()
  if (normalized === 'approved') return 'approved'
  if (normalized === 'refunded' || normalized === 'partially_refunded') return 'refunded'
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'voided') return 'cancelled'
  if (normalized === 'chargeback') return 'chargeback'
  if (normalized === 'disputed') return 'disputed'
  return null
}
