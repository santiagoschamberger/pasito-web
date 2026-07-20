import { NextRequest, NextResponse } from 'next/server'

import { getTomateSupabase, requestIpHash } from '@/lib/tomate-server'
import { readPasitosClaimToken } from '@/lib/tomate-ticket-security'

type ClaimResult = {
  status?: 'credited' | 'account_not_found' | 'payment_not_approved' | 'no_reward' | 'not_found' | 'invalid'
  amount?: number
  alreadyCredited?: boolean
}

const NO_ACCOUNT_MESSAGE = 'No encontramos una cuenta verificada de Pasito con ese email. Revisalo o probá con otro.'

export async function POST(request: NextRequest) {
  let body: { token?: unknown; email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const orderId = readPasitosClaimToken(token)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!orderId || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Revisá el enlace y el email ingresado.' }, { status: 400 })
  }

  const db = getTomateSupabase()
  try {
    const { data: allowed, error: rateError } = await db.rpc('event_consume_rate_limit', {
      p_scope: 'tomate-pasitos-claim',
      p_key_hash: requestIpHash(request, 'tomate-pasitos-claim'),
      p_limit: 12,
      p_window_seconds: 900,
    })
    if (rateError) throw rateError
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' }, { status: 429 })
    }

    const { data, error } = await db.rpc('event_claim_order_pasitos', {
      p_order_id: orderId,
      p_account_email: email,
    })
    if (error) throw error
    const result = (data ?? {}) as ClaimResult

    if (result.status === 'credited') {
      return NextResponse.json({
        ok: true,
        status: 'credited',
        amount: result.amount ?? 0,
        alreadyCredited: Boolean(result.alreadyCredited),
      }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }
    if (result.status === 'account_not_found') {
      return NextResponse.json({ error: NO_ACCOUNT_MESSAGE, amount: result.amount ?? 0 }, { status: 404 })
    }
    if (result.status === 'payment_not_approved') {
      return NextResponse.json({ error: 'La compra no está aprobada; no podemos acreditar este premio.' }, { status: 409 })
    }
    if (result.status === 'no_reward') {
      return NextResponse.json({ error: 'Esta compra no tiene Pasitos pendientes.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No encontramos el premio asociado a esta compra.' }, { status: 404 })
  } catch (error) {
    console.error('[tomate/pasitos] No se pudieron acreditar los Pasitos:', error)
    return NextResponse.json({ error: 'No pudimos acreditar los Pasitos. Probá nuevamente en unos minutos.' }, { status: 500 })
  }
}
