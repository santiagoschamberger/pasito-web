import { NextRequest, NextResponse } from 'next/server'

import { assertOpen, createDoorCookie, db, DOOR_COOKIE, getEvent, handleError, HttpError, pinHash, readJson } from '@/lib/gestion/server'
import { requestIpHash } from '@/lib/tomate-server'

type Params = { params: Promise<{ eventId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params
    assertOpen(await getEvent(eventId))
    const body = await readJson<{ pin?: unknown; operator?: unknown; device?: unknown }>(request)
    const pin = typeof body.pin === 'string' ? body.pin.replace(/\D/g, '') : ''
    const operator = typeof body.operator === 'string' ? body.operator.trim().slice(0, 60) : ''
    const device = typeof body.device === 'string' ? body.device.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) : ''
    if (pin.length !== 6) throw new HttpError(400, 'El PIN tiene 6 números.')

    const { data: allowed, error: rateError } = await db().rpc('event_consume_rate_limit', {
      p_scope: 'gestion-door-pin',
      p_key_hash: requestIpHash(request, `gestion-door-pin:${eventId}`),
      p_limit: 10,
      p_window_seconds: 900,
    })
    if (rateError) throw rateError
    if (!allowed) throw new HttpError(429, 'Demasiados intentos. Esperá 15 minutos.')

    const { data: pins } = await db()
      .from('gestion_door_pins')
      .select('id, valid_from, valid_until, label, revoked_at')
      .eq('event_id', eventId)
      .eq('pin_hash', pinHash(eventId, pin))
    const now = Date.now()
    const data = (pins ?? []).find((p) => !p.revoked_at && Date.parse(p.valid_from) <= now && Date.parse(p.valid_until) >= now)
    if (!data) {
      const early = (pins ?? []).find((p) => !p.revoked_at && Date.parse(p.valid_from) > now)
      const when = (iso: string) => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      if (early) throw new HttpError(401, `Este PIN se activa el ${when(early.valid_from)}.`)
      if ((pins ?? []).some((p) => p.revoked_at)) throw new HttpError(401, 'Este PIN fue revocado. Pedile uno nuevo al responsable.')
      if ((pins ?? []).length) throw new HttpError(401, 'Este PIN ya venció. Pedile uno nuevo al responsable.')
      throw new HttpError(401, 'PIN incorrecto.')
    }

    const cookie = createDoorCookie({ ev: eventId, pin: data.id, dev: device || 'sin-id', op: operator || data.label }, new Date(data.valid_until))
    const response = NextResponse.json({ ok: true, label: data.label })
    response.cookies.set(cookie.name, cookie.value, cookie.options)
    return response
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DOOR_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
