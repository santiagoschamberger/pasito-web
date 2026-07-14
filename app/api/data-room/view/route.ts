import { NextResponse } from 'next/server'
import {
  getDataRoomClient,
  getDataRoomClientHash,
  getValidDataRoomSession,
} from '@/lib/data-room/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: unknown } | null
  const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  if (!slug) return NextResponse.json({ error: 'Acceso inválido.' }, { status: 400 })

  const session = await getValidDataRoomSession(slug)
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const db = getDataRoomClient()
  const now = new Date().toISOString()
  const clientHash = getDataRoomClientHash(request.headers)
  const [eventResult] = await Promise.all([
    db.from('brand_data_room_events').insert({
      access_id: session.accessId,
      session_id: session.id,
      event_type: 'page_view',
      client_hash: clientHash,
    }),
    db.from('brand_data_room_sessions').update({ last_seen_at: now }).eq('id', session.id),
  ])

  if (eventResult.error) {
    console.error('[data-room/view] event insert failed:', eventResult.error.message)
    return NextResponse.json({ error: 'No se pudo registrar la vista.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
