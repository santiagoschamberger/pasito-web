import 'server-only'
import type { RebillPayment } from './tomate-rebill'

export async function getSilverRebillPayment(
  paymentId: string,
): Promise<RebillPayment> {
  const key = process.env.SILVER_REBILL_SECRET_KEY?.trim()
  if (!key) throw new Error('Falta SILVER_REBILL_SECRET_KEY.')
  const response = await fetch(
    `https://api.rebill.com/v3/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { 'x-api-key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    },
  )
  if (!response.ok) throw new Error(`Rebill respondió ${response.status}.`)
  return response.json() as Promise<RebillPayment>
}
