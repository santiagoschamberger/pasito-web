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

function confirmationHtml(notifyTickets: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #004027;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 48px 28px; background: #006d42; color: #ffffff;">
    <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 24px; opacity: 0.7;">× Pasito Club · Temporada 2026</p>
    <h2 style="font-size: 30px; line-height: 1.05; margin: 0 0 18px; font-weight: 800;">Ya tenés tu lugar en la largada.</h2>
    <p style="font-size: 15px; margin: 0 0 12px; line-height: 1.6;">
      No hace falta ser runner. De caminar tus primeros metros a correr tus primeros 3K: te vamos a avisar por acá cuando arranque el club.
    </p>${notifyTickets ? `
    <p style="font-size: 15px; margin: 0 0 12px; line-height: 1.6;">
      Y como pediste, te escribimos apenas salgan las entradas.
    </p>` : ''}
    <p style="font-size: 15px; margin: 28px 0 0; line-height: 1.6;">Todo empieza con un Pasito.<br/><strong>El equipo de Pasito Club</strong></p>
  </div>
</body>
</html>`
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
    return NextResponse.json({ error: 'Ese mail no camina. Revisalo.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Se nos trabó el paso. Probá de nuevo.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails
      .send({
        from: 'Pasito Club <noreply@pasito.app>',
        to: email,
        subject: 'Estás en la lista de Pasito Club',
        html: confirmationHtml(notifyTickets),
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
