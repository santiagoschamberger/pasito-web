import { NextRequest, NextResponse } from 'next/server'

import { TOMATE_EVENT } from '@/lib/tomate-event'
import { getTomateSupabase } from '@/lib/tomate-server'
import { extractTicketToken, readCheckinSession, readTicketToken, TOMATE_CHECKIN_COOKIE } from '@/lib/tomate-ticket-security'

export async function POST(request: NextRequest) {
  const session = readCheckinSession(request.cookies.get(TOMATE_CHECKIN_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'La sesión venció.' }, { status: 401 })

  let body: { value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid', error: 'Lectura inválida.' }, { status: 400 })
  }
  const value = typeof body.value === 'string' ? body.value.trim() : ''
  if (!value || value.length > 500) {
    return NextResponse.json({ status: 'invalid', error: 'QR o código inválido.' }, { status: 400 })
  }

  const token = extractTicketToken(value)
  const ticketId = token ? readTicketToken(token) : null
  const shortCode = token ? null : value.toUpperCase().replace(/[^A-F0-9]/g, '')
  if (!ticketId && shortCode?.length !== 10) {
    return NextResponse.json({ status: 'invalid', error: 'QR o código inválido.' }, { status: 404 })
  }

  try {
    const { data, error } = await getTomateSupabase().rpc('event_redeem_ticket', {
      p_event_slug: TOMATE_EVENT.slug,
      p_ticket_id: ticketId,
      p_short_code: shortCode,
      p_operator_id: session.operator,
      p_source: ticketId ? 'qr' : 'code',
    })
    if (error) throw error
    const result = (data ?? {}) as { status?: string }
    const status = result.status === 'invalid' ? 404 : 200
    return NextResponse.json(result, {
      status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[tomate/check-in] No se pudo validar la entrada:', error)
    return NextResponse.json({ status: 'error', error: 'No pudimos validar la entrada.' }, { status: 500 })
  }
}
