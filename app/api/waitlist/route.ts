import { waitlistConfirmationEmail } from '@/lib/web-email-templates'
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
      ...waitlistConfirmationEmail(email),
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
  revalidatePath('/uruguay')
  return NextResponse.json({ ok: true })
}
