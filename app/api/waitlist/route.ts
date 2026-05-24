import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

let supabase: SupabaseClient | null = null

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function waitlistConfirmationHtml(email: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #fafafa;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 48px 28px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 40px;">
      <img src="https://pasito.app/pasitohorizontal.png" alt="Pasito" width="100" style="display: inline-block;" />
    </div>
    <h2 style="font-size: 22px; color: #111; margin: 0 0 16px; font-weight: 600;">Sólo un pasito más.</h2>
    <p style="font-size: 15px; color: #555; margin: 0 0 8px; line-height: 1.6;">
      Por favor, confirmá el registro de <strong>${email}</strong> en la waitlist de Pasito, haciendo click en <strong>Confirmar</strong>.
    </p>
    <p style="font-size: 14px; color: #555; margin: 0 0 28px; line-height: 1.6;">
      Para asegurar tu lugar, solo te pedimos que confirmes tu registro haciendo click abajo.
    </p>
    <a href="https://pasito.app/confirmado" 
       style="display: inline-block; background: #0C6B45; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Confirmar
    </a>
    <div style="margin-top: 36px; padding-top: 28px; border-top: 1px solid #f0f0f0;">
      <p style="font-size: 14px; color: #555; margin: 0 0 16px; line-height: 1.7; font-style: italic;">
        Pasito no es solo una app.<br/>
        Es una forma de mover la ciudad, de salir más, de descubrir lugares nuevos… y de premiarlo.
      </p>
      <p style="font-size: 14px; color: #333; margin: 0;">
        Nos vemos adentro,<br/>
        <strong>Santi</strong>
      </p>
    </div>
    <div style="margin-top: 48px; text-align: center;">
      <p style="font-size: 11px; color: #bbb; margin: 0; letter-spacing: 0.03em;">pasito.app</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let email: string

  try {
    const body = await req.json()
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('waitlist')
    .insert({ email })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, already: true })
    }
    console.error('Waitlist insert error:', error)
    return NextResponse.json({ error: 'No se pudo guardar. Intentá de nuevo.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = getResend()
    resend.emails.send({
      from: 'Pasito <noreply@pasito.app>',
      to: email,
      subject: 'Confirmá tu lugar en la familia Pasito',
      html: waitlistConfirmationHtml(email),
    }).catch((err) => console.error('[email] Waitlist confirmation error:', err))

    // Add to Resend "Waitlist" audience
    const waitlistAudienceId = process.env.RESEND_AUDIENCE_ID_WAITLIST
    if (waitlistAudienceId) {
      resend.contacts.create({
        audienceId: waitlistAudienceId,
        email,
      }).catch((err) => console.error('[resend] Failed to add waitlist contact:', err))
    }
  }

  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
