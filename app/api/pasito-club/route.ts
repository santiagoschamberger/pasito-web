import { clubWaitlistEmail } from '@/lib/web-email-templates'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

import { normalizePasitoClubEmail, PASITO_CLUB_WAITLIST_TABLE } from '@/lib/pasito-club-waitlist'

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!supabase) supabase = createClient(url, key)
  return supabase
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  // Honeypot: real users never see this field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const email = normalizePasitoClubEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: 'Revisá tu mail, parece que no es válido.' }, { status: 400 })
  }

  const db = getSupabase()
  if (!db) {
    console.error('[pasito-club] Supabase env vars missing; signup not stored.')
    return NextResponse.json(
      { error: 'Todavía no abrimos la lista. Probá en un ratito.' },
      { status: 503 }
    )
  }

  const notifyTickets = body.notifyTickets === true

  const { error } = await db.from(PASITO_CLUB_WAITLIST_TABLE).insert({
    email,
    notify_tickets: notifyTickets,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      if (notifyTickets) {
        const { error: updateError } = await db
          .from(PASITO_CLUB_WAITLIST_TABLE)
          .update({ notify_tickets: true })
          .eq('email', email)
        if (updateError) console.error('[pasito-club] notify_tickets update error:', updateError)
      }
      return NextResponse.json({ ok: true, already: true })
    }
    console.error('[pasito-club] Waitlist insert error:', error)
    return NextResponse.json({ error: 'No pudimos anotarte. Probá de nuevo.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails
      .send({
        from: 'Pasito Club <noreply@pasito.app>',
        to: email,
        ...clubWaitlistEmail(notifyTickets),
      })
      .catch((err) => console.error('[pasito-club] Confirmation email error:', err))

    const audienceId = process.env.RESEND_AUDIENCE_ID_PASITO_CLUB
    if (audienceId) {
      resend.contacts
        .create({ audienceId, email })
        .catch((err) => console.error('[pasito-club] Failed to add Resend contact:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
