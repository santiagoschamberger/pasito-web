import { NextRequest, NextResponse } from 'next/server'

import { getTomateSupabase, requestIpHash } from '@/lib/tomate-server'
import { isTomateSupportId } from '@/lib/tomate-support-id'
import { readPasitosClaimToken } from '@/lib/tomate-ticket-security'

type ClaimResult = {
  status?: 'credited' | 'support_id_invalid' | 'payment_not_approved' | 'no_reward' | 'not_found' | 'invalid' | 'invalid_count'
  amount?: number
  alreadyCredited?: boolean
  invalidPositions?: number[]
  ambiguousPositions?: number[]
}

export async function POST(request: NextRequest) {
  let body: { token?: unknown; supportIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const orderId = readPasitosClaimToken(token)
  const supportIds = Array.isArray(body.supportIds)
    ? body.supportIds.map((value) => typeof value === 'string' ? value.trim().toUpperCase() : '')
    : []
  if (!orderId || supportIds.length < 1 || supportIds.length > 6 || supportIds.some((id) => !isTomateSupportId(id))) {
    return NextResponse.json({ error: 'Revisá el enlace y los IDs de soporte ingresados.' }, { status: 400 })
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

    const { data, error } = await db.rpc('event_claim_order_pasitos_by_support_codes', {
      p_order_id: orderId,
      p_support_ids: supportIds,
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
    if (result.status === 'support_id_invalid') {
      const invalidPositions = result.invalidPositions ?? []
      const ambiguousPositions = result.ambiguousPositions ?? []
      const messages: string[] = []
      if (invalidPositions.length > 0) {
        const entries = invalidPositions.map((position) => `entrada ${position}`).join(', ')
        messages.push(`No encontramos una cuenta de Pasito para ${entries}. Revisá ${invalidPositions.length === 1 ? 'ese ID' : 'esos IDs'} de soporte.`)
      }
      if (ambiguousPositions.length > 0) {
        const entries = ambiguousPositions.map((position) => `entrada ${position}`).join(', ')
        messages.push(`El ID de ${entries} coincide con más de una cuenta. Escribinos a soporte para acreditarlo de forma segura.`)
      }
      return NextResponse.json({
        error: messages.join(' ') || 'Revisá los IDs de soporte ingresados.',
        amount: result.amount ?? 0,
      }, { status: 422 })
    }
    if (result.status === 'invalid_count') {
      return NextResponse.json({ error: 'Tenés que ingresar un ID de soporte por cada entrada.' }, { status: 400 })
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
