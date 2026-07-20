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

export async function getRebillPayment(paymentId: string): Promise<RebillPayment> {
  const apiKey = process.env.REBILL_SECRET_KEY
  if (!apiKey) throw new Error('Falta REBILL_SECRET_KEY.')

  const response = await fetch(`${REBILL_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`Rebill respondió ${response.status}.`)
  return response.json() as Promise<RebillPayment>
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
