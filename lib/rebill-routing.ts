import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { RebillPayment } from './tomate-rebill'

export type RebillAccount = 'SIN_IVA' | 'CON_IVA' | 'SILVER_LEGACY'
export function rebillRoutingEnabled() { return process.env.NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED === 'true' }
const verifiedRequests = new WeakMap<Request, RebillPayment>()
export function bindVerifiedPayment(request: Request, payment: RebillPayment) { verifiedRequests.set(request, payment) }
export function webhookSecretsEqual(expected?: string, provided?: string) {
  if (!expected || !provided) return false
  return timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(provided).digest())
}
function assertRebillAccountsReady() {
  if (!rebillRoutingEnabled()) return
  if (!process.env.NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY?.trim()) throw new Error('Falta configurar el checkout SIN_IVA.')
  const keys = [process.env.REBILL_NO_IVA_SECRET_KEY, process.env.REBILL_SECRET_KEY].map(key => key?.trim())
  if (keys.some(key => !key) || keys[0] === keys[1]) throw new Error('Las cuentas Rebill no están configuradas de forma independiente.')
  const secrets = [process.env.REBILL_WEBHOOK_SECRET, process.env.REBILL_NEW_WEBHOOK_SECRET].map(key => key?.trim())
  if (secrets.some(key => !key) || secrets[0] === secrets[1]) throw new Error('Las rutas Rebill no identifican cuentas independientes.')
  if (process.env.SILVER_REBILL_SECRET_KEY?.trim() && process.env.SILVER_REBILL_ACCOUNT !== 'SIN_IVA' && process.env.SILVER_REBILL_ACCOUNT !== 'CON_IVA') {
    throw new Error('La cuenta Silver no está clasificada como SIN_IVA o CON_IVA.')
  }
  const legacyKey = process.env.REBILL_LEGACY_SECRET_KEY?.trim()
  if (legacyKey && legacyKey === process.env.REBILL_SECRET_KEY?.trim()) {
    throw new Error('La clave histórica de Rebill no es independiente.')
  }
}
export function assertRebillCheckoutReady() {
  if (rebillRoutingEnabled() && process.env.REBILL_NEW_CHECKOUTS_PAUSED === 'true') throw new Error('Los nuevos checkouts están pausados.')
  assertRebillAccountsReady()
}
export function webhookRebillAccount(secret: string): RebillAccount | null {
  const routes: [string | undefined, RebillAccount][] = [[process.env.REBILL_WEBHOOK_SECRET,'SIN_IVA'],[process.env.REBILL_NEW_WEBHOOK_SECRET,'CON_IVA'],[process.env.SILVER_REBILL_WEBHOOK_SECRET,'SILVER_LEGACY']]
  const accounts = new Set(routes.filter(([value]) => webhookSecretsEqual(value?.trim(), secret)).map(([, account]) => account))
  if (accounts.size > 1) throw new Error('Ruta de webhook ambigua.')
  return [...accounts][0] ?? null
}
export async function resolveRebillPayment(paymentId: string, expectedAccount?: unknown, request?: Request): Promise<RebillPayment> {
  if (expectedAccount != null && !['SIN_IVA','CON_IVA','SILVER_LEGACY'].includes(String(expectedAccount))) throw new Error('Cuenta Rebill desconocida.')
  const cached = request && verifiedRequests.get(request)
  if (cached) {
    if (cached.id !== paymentId || (expectedAccount && cached.rebillAccount !== expectedAccount)) throw new Error('El pago pertenece a otra cuenta.')
    return cached
  }
  assertRebillAccountsReady()
  const candidates: [RebillAccount, string | undefined][] = [['SIN_IVA',process.env.REBILL_NO_IVA_SECRET_KEY],['CON_IVA',process.env.REBILL_SECRET_KEY],['SIN_IVA',process.env.REBILL_LEGACY_SECRET_KEY],[(process.env.SILVER_REBILL_ACCOUNT === 'SIN_IVA' || process.env.SILVER_REBILL_ACCOUNT === 'CON_IVA' ? process.env.SILVER_REBILL_ACCOUNT : 'SILVER_LEGACY'),process.env.SILVER_REBILL_SECRET_KEY]]
  const keys = new Map<string, RebillAccount>()
  for (const [account, value] of candidates) {
    const key = value?.trim()
    if (!key) continue
    const prior = keys.get(key)
    // A shared Silver key is an alias of its known global account; it does not
    // justify creating or moving an old payment into a different organization.
    if (prior && account !== 'SILVER_LEGACY' && prior !== account) throw new Error('Credenciales de cuentas distintas coinciden.')
    if (!prior) keys.set(key,account)
  }
  const matches = (await Promise.all([...keys].map(async ([key,account]) => {
    const response = await fetch(`https://api.rebill.com/v3/payments/${encodeURIComponent(paymentId)}`, { headers:{'x-api-key':key}, cache:'no-store', signal:AbortSignal.timeout(12_000) })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Rebill respondió ${response.status}.`)
    const body = await response.json()
    const payment = (body.data?.payment ?? body.data ?? body) as RebillPayment
    if (payment.id !== paymentId) throw new Error('Identidad del pago inválida.')
    return { ...payment, rebillAccount:account }
  }))).filter((payment): payment is RebillPayment & {rebillAccount: RebillAccount} => payment !== null)
  const uniqueAccounts = new Set(matches.map(payment => payment.rebillAccount))
  if (uniqueAccounts.size !== 1) throw new Error(matches.length ? 'Identificador de pago ambiguo entre cuentas.' : 'Pago Rebill no encontrado.')
  const payment=matches[0]
  if (matches.some(match => JSON.stringify([match.amount,match.currency,match.metadata]) !== JSON.stringify([payment.amount,payment.currency,payment.metadata]))) throw new Error('Respuestas inconsistentes para la misma cuenta.')
  if (expectedAccount && payment.rebillAccount !== expectedAccount) throw new Error('El pago pertenece a otra cuenta.')
  return payment
}

// A new checkout records its account before the SDK opens. Historical NULL
// bindings are read-only: ownership must be proven using the provider.
export function assertIntentAccount(intent: {rebill_account?: unknown}, payment: RebillPayment) {
  if (!rebillRoutingEnabled()) return
  if (intent.rebill_account != null && intent.rebill_account !== payment.rebillAccount) {
    console.error('[rebill-routing] ACCOUNT_MISMATCH: Intent routed to', intent.rebill_account, 'but payment charged to', payment.rebillAccount, '(payment', payment.id, ')')
    throw new Error('El pago pertenece a otra cuenta que la reserva.')
  }
}

export async function checkOrderAccount(
  db: import('@supabase/supabase-js').SupabaseClient,
  table: 'event_ticket_orders' | 'tienda_orders', payment: RebillPayment,
) {
  if (!rebillRoutingEnabled()) return
  const row=await db.from(table).select('rebill_account').eq('rebill_payment_id',payment.id).maybeSingle()
  if (row.error) throw new Error('No pudimos verificar la cuenta de la orden.')
  if (row.data) {
    try {
      assertIntentAccount(row.data,payment)
    } catch (error) {
      console.error('[rebill-routing] WEBHOOK_ACCOUNT_MISMATCH: Order recorded for', row.data.rebill_account, 'but payment received on', payment.rebillAccount, '(payment', payment.id, ')')
      throw error
    }
  }
}
export async function bindNewOrderAccount(
  db: import('@supabase/supabase-js').SupabaseClient,
  table: 'event_ticket_orders' | 'tienda_orders', payment: RebillPayment,
  intent: {rebill_account?: unknown},
) {
  if (!rebillRoutingEnabled() || intent.rebill_account == null) return
  assertIntentAccount(intent,payment)
  // A non-NULL intent identifies a checkout created after activation. Retrying
  // a lost acknowledgement can finish that new binding; old NULL intents do
  // not trigger foreground history repair.
  const result=await db.from(table).update({rebill_account:payment.rebillAccount})
    .eq('rebill_payment_id',payment.id).is('rebill_account',null)
  if (result.error) throw new Error('No pudimos guardar la cuenta de la orden.')
}

/**
 * Verify that the client's Rebill account (from the bundle it was built with)
 * matches the account the server would route this checkout to.
 * 
 * This prevents stale browser tabs with old Rebill keys from creating intents
 * that would be charged to the wrong account.
 * 
 * @param clientAccount - The Rebill account the client was built for (from getClientRebillAccount)
 * @param expectedAccount - The account this checkout should use ('SIN_IVA' by default)
 * @throws Error with a user-facing message if there's a mismatch or the field is missing
 */
export function assertClientRebillAccount(
  clientAccount: unknown,
  expectedAccount: RebillAccount = 'SIN_IVA',
): void {
  if (!rebillRoutingEnabled()) {
    // Routing disabled: no check needed (legacy mode)
    return
  }

  // Normalize and validate the client account value
  const normalizedClient = typeof clientAccount === 'string' ? clientAccount.trim() : ''
  
  if (!normalizedClient) {
    // Missing client account: this is a stale tab from before the guard was deployed.
    // We reject it to ensure the buyer reloads and gets the latest code with the correct key.
    throw new Error('STALE_TAB_DETECTED')
  }

  if (!['SIN_IVA', 'CON_IVA', 'SILVER_LEGACY'].includes(normalizedClient)) {
    // Invalid account value
    throw new Error('INVALID_CLIENT_ACCOUNT')
  }

  if (normalizedClient !== expectedAccount) {
    // Mismatch: the client was built for a different account than the server expects.
    // This happens when a browser tab was loaded with an old build that had a different
    // Rebill public key, then the deployment switched accounts.
    console.error(`[rebill-routing] Client/server account mismatch: client=${normalizedClient}, expected=${expectedAccount}`)
    throw new Error('STALE_TAB_DETECTED')
  }

  // Match: proceed with checkout
}
