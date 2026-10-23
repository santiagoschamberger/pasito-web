import { ambassadorNotificationEmail } from '@/lib/web-email-templates'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AmbassadorLead = {
  fullName: string
  instagram: string
  location: string
  email: string
  whatsapp: string
  pasitoReason: string
}

let supabase: SupabaseClient | null = null

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  }
  return supabase
}

function readString(body: Record<string, unknown>, key: keyof AmbassadorLead) {
  const value = body[key]
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  let rawBody: unknown

  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const body = rawBody as Record<string, unknown>
  const lead: AmbassadorLead = {
    fullName: readString(body, 'fullName'),
    instagram: readString(body, 'instagram'),
    location: readString(body, 'location'),
    email: readString(body, 'email').toLowerCase(),
    whatsapp: readString(body, 'whatsapp'),
    pasitoReason: readString(body, 'pasitoReason'),
  }

  if (!lead.fullName || !lead.instagram || !lead.location || !lead.email || !lead.whatsapp || !lead.pasitoReason) {
    return NextResponse.json({ error: 'Completá todos los campos.' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json({ error: 'Mail inválido.' }, { status: 400 })
  }

  if (lead.whatsapp.replace(/\D/g, '').length < 8) {
    return NextResponse.json({ error: 'WhatsApp inválido.' }, { status: 400 })
  }

  if (lead.pasitoReason.length > 600) {
    return NextResponse.json({ error: 'La respuesta es demasiado larga.' }, { status: 400 })
  }

  const supabaseClient = getSupabase()

  if (!supabaseClient) {
    console.error('[ambassadors] Missing Supabase environment variables.')
    return NextResponse.json({ error: 'No se pudo guardar. Intentá de nuevo.' }, { status: 500 })
  }

  const { error: insertError } = await supabaseClient
    .from('embajadores')
    .insert({
      full_name: lead.fullName,
      instagram: lead.instagram,
      location: lead.location,
      email: lead.email,
      whatsapp: lead.whatsapp,
      pasito_reason: lead.pasitoReason,
      user_agent: req.headers.get('user-agent'),
    })

  if (insertError) {
    console.error('[ambassadors] Supabase insert error:', insertError)
    return NextResponse.json({ error: 'No se pudo guardar. Intentá de nuevo.' }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return NextResponse.json({ ok: true })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pasito Embajadores <contacto@pasito.app>',
        to: ['contacto@pasito.app'],
        reply_to: lead.email,
        ...ambassadorNotificationEmail(lead),
        text: [
          'Nuevo lead de Embajador Pasito',
          `Nombre y apellido: ${lead.fullName}`,
          `Instagram: ${lead.instagram}`,
          `Dónde quiere representar a Pasito: ${lead.location}`,
          `Mail: ${lead.email}`,
          `WhatsApp: ${lead.whatsapp}`,
          `Por qué te gusta Pasito: ${lead.pasitoReason}`,
        ].join('\n'),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[ambassadors] Resend API error:', error)
    }
  } catch (error) {
    console.error('[ambassadors] Resend request failed:', error)
  }

  return NextResponse.json({ ok: true })
}
