import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * dLocal Go payment integration for Uruguay Walking Club event.
 * 
 * Uses dLocal Go's Hosted Checkout (redirect flow) for simplicity and PCI compliance.
 * 
 * Documentation: https://docs.dlocalgo.com/
 * 
 * Required environment variables:
 * - DLOCALGO_API_KEY: API key from dLocal Go account
 * - DLOCALGO_SECRET_KEY: Secret key for server-side operations
 * - DLOCALGO_ENVIRONMENT: production or sandbox (optional explicit override)
 * Webhook signatures use the same API key and secret key.
 */

export function dlocalGoApiUrl(): string {
  const environment = process.env.DLOCALGO_ENVIRONMENT
    || (process.env.VERCEL_ENV === 'production' ? 'production' : 'sandbox')
  if (environment !== 'production' && environment !== 'sandbox') {
    throw new Error('DLOCALGO_ENVIRONMENT debe ser production o sandbox.')
  }
  return environment === 'production' ? 'https://api.dlocalgo.com' : 'https://api-sbx.dlocalgo.com'
}

export class DlocalGoApiError extends Error {
  status: number
  constructor(status: number) {
    super(`dLocal Go respondió ${status}.`)
    this.status = status
  }
}

export type DlocalGoPayment = {
  id?: string
  status?: string
  amount?: number | string
  currency?: string
  country?: string
  order_id?: string
  redirect_url?: string
  created_date?: string
  payer?: {
    id?: string
    first_name?: string
    last_name?: string
    name?: string
    email?: string
    phone?: string
    document?: string
    document_type?: string
  }
}

export type CreatePaymentParams = {
  amount: number
  currency: string
  country: string
  orderId: string
  description: string
  successUrl: string
  backUrl: string
  notificationUrl: string
  expirationMinutes: number
  payerEmail?: string
  payerName?: string
}

function getDlocalGoCredentials(): { apiKey: string; secretKey: string } {
  const apiKey = process.env.DLOCALGO_API_KEY?.trim()
  const secretKey = process.env.DLOCALGO_SECRET_KEY?.trim()
  
  if (!apiKey || !secretKey) {
    throw new Error('Faltan DLOCALGO_API_KEY y DLOCALGO_SECRET_KEY. Configure las claves en las variables de entorno.')
  }
  
  return { apiKey, secretKey }
}

function getAuthHeader(): string {
  const { apiKey, secretKey } = getDlocalGoCredentials()
  return `Bearer ${apiKey}:${secretKey}`
}

/**
 * Creates a payment in dLocal Go and returns the redirect URL for the hosted checkout.
 * The user completes payment on dLocal Go's page, then returns to successUrl.
 */
export async function createDlocalGoPayment(params: CreatePaymentParams): Promise<{
  paymentId: string
  redirectUrl: string
  status: string
}> {
  const requestBody = {
    amount: params.amount,
    currency: params.currency,
    country: params.country,
    order_id: params.orderId,
    description: params.description,
    success_url: params.successUrl,
    back_url: params.backUrl,
    notification_url: params.notificationUrl,
    expiration_type: 'MINUTES',
    expiration_value: params.expirationMinutes,
    ...(params.payerEmail ? {
      payer: {
        email: params.payerEmail,
        ...(params.payerName ? { name: params.payerName } : {}),
      },
    } : {}),
  }

  const response = await fetch(`${dlocalGoApiUrl()}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new DlocalGoApiError(response.status)
  }

  const data = await response.json() as {
    id?: string
    redirect_url?: string
    status?: string
  }

  if (!data.id || !data.redirect_url) {
    throw new Error('Respuesta de dLocal Go incompleta.')
  }

  return {
    paymentId: data.id,
    redirectUrl: data.redirect_url,
    status: data.status || 'PENDING',
  }
}

/**
 * Retrieves payment details from dLocal Go API.
 * Used to verify payment status after redirect or webhook notification.
 */
export async function getDlocalGoPayment(paymentId: string): Promise<DlocalGoPayment> {
  const response = await fetch(`${dlocalGoApiUrl()}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`dLocal Go respondió ${response.status}.`)
  }

  return response.json() as Promise<DlocalGoPayment>
}

export function dlocalGoCustomerName(payment: DlocalGoPayment): string | null {
  return payment.payer?.name?.trim() || [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ').trim() || null
}

export function normalizeDlocalGoStatus(status: string | undefined):
  | 'approved'
  | 'refunded'
  | 'cancelled'
  | 'rejected'
  | null {
  const normalized = status?.toUpperCase()
  if (normalized === 'PAID' || normalized === 'APPROVED') return 'approved'
  if (normalized === 'REFUNDED') return 'refunded'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
  if (normalized === 'REJECTED') return 'rejected'
  return null
}

/**
 * Validates that the payment amount matches the expected amount.
 */
export function isDlocalGoPaymentAmountValid(
  paymentAmount: number | string | undefined,
  expectedAmount: number,
): boolean {
  const amount = typeof paymentAmount === 'string' ? Number(paymentAmount.trim() || NaN) : paymentAmount
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return false
  
  // Allow 1 cent difference for rounding
  return Math.abs(amount - expectedAmount) < 0.01
}

export function verifyDlocalGoNotification(payload: string, authorization: string | null): boolean {
  const match = /^V2-HMAC-SHA256, Signature: ([a-f0-9]{64})$/i.exec(authorization || '')
  if (!match) return false
  const { apiKey, secretKey } = getDlocalGoCredentials()
  const expected = createHmac('sha256', secretKey).update(apiKey + payload).digest()
  return timingSafeEqual(expected, Buffer.from(match[1], 'hex'))
}

export function dlocalGoPaymentMatchesIntent(payment: DlocalGoPayment, intent: {
  id: string; amount: number; currency: string; payment_provider_id: string | null
}): boolean {
  return payment.id === intent.payment_provider_id
    && payment.order_id === intent.id
    && payment.currency === intent.currency
    && payment.country === 'UY'
    && isDlocalGoPaymentAmountValid(payment.amount, intent.amount)
}
