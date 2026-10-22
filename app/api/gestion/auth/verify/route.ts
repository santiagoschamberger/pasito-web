import { NextRequest, NextResponse } from 'next/server'

import { createSessionCookie, db, hashToken, isAllowedEmail } from '@/lib/gestion/server'

// GET: links viejos o los mails ya enviados. Redirige a la pantalla que confirma con un toque.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const next = request.nextUrl.searchParams.get('next') ?? '/gestion'
  const url = new URL('/gestion/login', request.url)
  if (token) url.searchParams.set('token', token)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url, 303)
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const token = String(form?.get('token') ?? '')
  const nextParam = String(form?.get('next') ?? '/gestion')
  const next = nextParam.startsWith('/gestion') && !nextParam.startsWith('//') ? nextParam : '/gestion'
  const fail = (reason: string) => NextResponse.redirect(new URL(`/gestion/login?error=${reason}`, request.url), 303)
  if (!token || token.length > 100) return fail('link')

  const supabase = db()
  const { data, error } = await supabase
    .from('gestion_login_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('email')
    .maybeSingle()
  if (error || !data) return fail('vencido')

  const email = data.email as string
  const { data: existing } = await supabase.from('gestion_users').select('email').eq('email', email).maybeSingle()
  if (!existing) {
    if (!isAllowedEmail(email)) return fail('acceso')
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    await supabase.from('gestion_users').insert({ email, name, role: 'equipo' })
  }
  await supabase.from('gestion_users').update({ last_seen_at: new Date().toISOString() }).eq('email', email)

  const cookie = createSessionCookie(email)
  const response = NextResponse.redirect(new URL(next, request.url), 303)
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
