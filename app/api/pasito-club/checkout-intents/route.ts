import { NextRequest, NextResponse } from 'next/server'

import {
  PASITO_CLUB_EVENT,
  PASITO_CLUB_PRICING_OPTION,
  PASITO_CLUB_RACE,
  PASITO_CLUB_TERMS_VERSION,
  PASITO_CLUB_TRAININGS,
  findPack,
  isValidEmail,
  normalizeWhatsapp,
  packIncludesRace,
  raceIsUpcoming,
  trainingIsUpcoming,
} from '@/lib/pasito-club-event'
import {
  PASITO_CLUB_BUYER_COOKIE,
  pasitoClubCheckoutIdentity,
  pasitoClubStore,
} from '@/lib/pasito-club-server'
import { createIntentToken } from '@/lib/tomate-ticket-security'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(request: NextRequest) {
  let body: { packSize?: unknown; positions?: unknown; email?: unknown; phone?: unknown; termsAccepted?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400, headers })
  }

  if (PASITO_CLUB_EVENT.salesClosed) {
    return NextResponse.json({ error: 'La venta de entradas está cerrada.' }, { status: 409, headers })
  }

  const pack = findPack(Number(body.packSize))
  if (!pack) return NextResponse.json({ error: 'Elegí un pack válido.' }, { status: 400, headers })

  const positions = Array.isArray(body.positions) ? body.positions.map(Number) : []
  const trainings = positions.map((position) => PASITO_CLUB_TRAININGS.find((item) => item.position === position))
  if (
    positions.length !== pack.size
    || new Set(positions).size !== positions.length
    || trainings.some((training) => !training || !trainingIsUpcoming(training))
  ) {
    return NextResponse.json({ error: `Elegí ${pack.size} ${pack.size === 1 ? 'fecha' : 'fechas'} que todavía no pasaron.` }, { status: 400, headers })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Revisá tu email.' }, { status: 400, headers })
  const phone = normalizeWhatsapp(typeof body.phone === 'string' ? body.phone : '')
  if (!phone) {
    return NextResponse.json({ error: 'Revisá tu WhatsApp: código de área + número, ej. 11 2345 6789.' }, { status: 400, headers })
  }
  if (body.termsAccepted !== true) {
    return NextResponse.json({ error: 'Tenés que aceptar las bases y condiciones.' }, { status: 400, headers })
  }

  try {
    const store = pasitoClubStore()
    const inventory = await store.inventory()
    const tierIds = positions.map((position) => inventory.find((tier) => tier.position === position)?.tierId)
    if (tierIds.some((id) => id === undefined)) throw new Error('Faltan fechas de Pasito Club en la base.')
    const raceTier = inventory.find((tier) => tier.position === PASITO_CLUB_RACE.position)
    const includesRace = packIncludesRace(pack.size) && raceIsUpcoming() && Boolean(raceTier)

    const identity = pasitoClubCheckoutIdentity(request)
    const result = await store.reserve({
      tierIds: tierIds as number[],
      raceTierId: includesRace ? raceTier!.tierId : null,
      amount: pack.price,
      packSize: pack.size,
      pricingOption: PASITO_CLUB_PRICING_OPTION,
      email,
      phone,
      termsVersion: PASITO_CLUB_TERMS_VERSION,
      clientKeyHash: identity.clientKeyHash,
      clientIpHash: identity.clientIpHash,
    })

    if (result.status === 'rate_limited') {
      return NextResponse.json({ error: 'Hay demasiadas reservas abiertas desde esta conexión. Esperá unos minutos.' }, { status: 429, headers })
    }
    if (result.status === 'sold_out') {
      const soldOutPositions = inventory.filter((tier) => result.tierIds?.includes(tier.tierId)).map((tier) => tier.position)
      return NextResponse.json({ error: 'Se agotaron los cupos de alguna fecha que elegiste. Cambiala por otra.', soldOutPositions }, { status: 409, headers })
    }
    if (result.status !== 'reserved' || !result.intentId || !result.expiresAt || typeof result.amount !== 'number') {
      throw new Error(`Respuesta de reserva inesperada: ${result.status ?? 'vacía'}`)
    }

    const response = NextResponse.json({
      intentId: result.intentId,
      intentToken: createIntentToken(result.intentId),
      quantity: result.quantity,
      amount: result.amount,
      currency: result.currency ?? 'ARS',
      packSize: pack.size,
      positions: [...positions].sort((a, b) => a - b),
      includesRace,
      email,
      phone,
      expiresAt: result.expiresAt,
    }, { headers })
    if (identity.isNewBuyer) {
      response.cookies.set(PASITO_CLUB_BUYER_COOKIE, identity.buyerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 90 * 24 * 60 * 60,
      })
    }
    return response
  } catch (error) {
    console.error('[pasito-club/checkout-intents] No se pudo reservar:', error)
    return NextResponse.json({ error: 'No pudimos reservar tu lugar. Probá nuevamente.' }, { status: 500, headers })
  }
}
