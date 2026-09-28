import 'server-only'

/**
 * Dlocal payment integration for Uruguay Walking Club event.
 * 
 * TODO: This is a scaffold. Integration requires:
 * - DLOCAL_API_KEY: API key from Dlocal account
 * - DLOCAL_SECRET_KEY: Secret key for payment verification
 * - DLOCAL_WEBHOOK_SECRET: Secret for webhook signature validation
 * 
 * Dlocal API documentation: https://docs.dlocal.com/
 */

export type DlocalPayment = {
  id?: string
  status?: string
  amount?: number | string
  currency?: string
  installments?: number | null
  metadata?: Record<string, unknown>
  payer?: {
    email?: string
    name?: string
    document?: string
  }
}

function getDlocalSecretKey(): string {
  const key = process.env.DLOCAL_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('Falta DLOCAL_SECRET_KEY. Configure la clave en las variables de entorno.')
  }
  return key
}

export async function getDlocalPayment(paymentId: string): Promise<DlocalPayment> {
  const secretKey = getDlocalSecretKey()
  
  // TODO: Implement actual Dlocal API call
  // const response = await fetch(`https://api.dlocal.com/v1/payments/${encodeURIComponent(paymentId)}`, {
  //   headers: {
  //     'Authorization': `Bearer ${secretKey}`,
  //     'Content-Type': 'application/json',
  //   },
  //   cache: 'no-store',
  //   signal: AbortSignal.timeout(12_000),
  // })
  //
  // if (!response.ok) {
  //   throw new Error(`Dlocal respondió ${response.status}.`)
  // }
  //
  // return response.json() as Promise<DlocalPayment>
  
  throw new Error('Dlocal integration not yet implemented. Configure DLOCAL_SECRET_KEY and implement getDlocalPayment.')
}

export function dlocalCustomerName(payment: DlocalPayment): string | null {
  return payment.payer?.name?.trim() || null
}

export function normalizeDlocalStatus(status: string | undefined):
  | 'approved'
  | 'refunded'
  | 'cancelled'
  | 'chargeback'
  | 'disputed'
  | null {
  const normalized = status?.toLowerCase()
  if (normalized === 'paid' || normalized === 'approved') return 'approved'
  if (normalized === 'refunded' || normalized === 'partially_refunded') return 'refunded'
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'voided') return 'cancelled'
  if (normalized === 'chargeback') return 'chargeback'
  if (normalized === 'disputed') return 'disputed'
  return null
}

/**
 * Validates that the payment amount matches the expected amount.
 * For Dlocal, similar to Rebill, we need to handle installments if applicable.
 */
export function isDlocalPaymentAmountValid(
  paymentAmount: number | string | undefined,
  expectedAmount: number,
  installments?: number | null,
): boolean {
  const amount = typeof paymentAmount === 'string' ? Number.parseFloat(paymentAmount) : paymentAmount
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return false
  
  // If no installments or single payment, amount should match exactly
  if (!installments || installments <= 1) {
    return Math.abs(amount - expectedAmount) < 0.01
  }
  
  // With installments, the total might be slightly higher due to fees
  // Allow up to 20% over the expected amount for financed payments
  const maxAmount = expectedAmount * 1.20
  return amount >= expectedAmount - 0.01 && amount <= maxAmount
}
