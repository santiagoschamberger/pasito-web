import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type WithdrawalStatus =
  | 'ready'
  | 'withdrawn'
  | 'already_withdrawn'
  | 'expired'
  | 'not_active'
  | 'invalid'

type WithdrawalResult = {
  status?: WithdrawalStatus
  title?: string
  start_at?: string
  address?: string
  refunded_pasitos?: number
  spots_left?: number | null
}

const TOKEN_PATTERN = /^[a-f0-9]{64}$/
const PAGE_PATH = '/eventos/decathlon/baja'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase admin credentials are unavailable.')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

function formatEventDate(value?: string): string {
  if (!value) return 'Domingo 9 de agosto · 9:30 h'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function responseHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
  }
}

function page(params: {
  eyebrow: string
  title: string
  body: string
  panel?: string
  form?: string
}): Response {
  const html = `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(params.title)} · Pasito</title>
    </head>
    <body style="margin:0;background:#f2f5ec;color:#17382a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <main style="box-sizing:border-box;min-height:100vh;padding:36px 18px;display:grid;place-items:center;">
        <section style="width:100%;max-width:560px;overflow:hidden;border-radius:26px;background:#fff;box-shadow:0 20px 70px rgba(20,55,41,.12);">
          <header style="padding:28px 30px;background:#0c6b45;color:#fff;">
            <div style="font-size:28px;font-weight:900;letter-spacing:-.04em;">pasito</div>
          </header>
          <div style="padding:32px 28px 34px;">
            <p style="margin:0 0 9px;color:#0c6b45;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;">${escapeHtml(params.eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;letter-spacing:-.025em;">${escapeHtml(params.title)}</h1>
            <div style="color:#52655b;font-size:16px;line-height:1.65;">${params.body}</div>
            ${params.panel ?? ''}
            ${params.form ?? ''}
            <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e8ede6;color:#52655b;font-size:13px;line-height:1.55;">Si necesitás ayuda, respondé el email que recibiste o escribinos a <strong>soporte@pasito.app</strong>.</p>
          </div>
        </section>
      </main>
    </body>
  </html>`

  return new Response(html, { status: 200, headers: responseHeaders() })
}

function invalidPage(status: WithdrawalStatus): Response {
  if (status === 'expired') {
    return page({
      eyebrow: 'Inscripción · Todos a Decathlon',
      title: 'Este enlace ya venció',
      body: '<p style="margin:0;">La ventana para liberar el cupo ya cerró. Tu inscripción no fue modificada.</p>',
    })
  }

  if (status === 'already_withdrawn') {
    return page({
      eyebrow: 'Inscripción · Todos a Decathlon',
      title: 'Tu cupo ya fue liberado',
      body: '<p style="margin:0;">La baja ya estaba confirmada. No hicimos ningún cambio adicional.</p>',
      panel: '<div style="margin-top:22px;padding:18px;border-radius:15px;background:#edf8f1;color:#17382a;font-weight:700;">Tus 20 Pasitos fueron devueltos y el lugar quedó disponible para otra persona.</div>',
    })
  }

  if (status === 'not_active') {
    return page({
      eyebrow: 'Inscripción · Todos a Decathlon',
      title: 'No hay una inscripción activa',
      body: '<p style="margin:0;">No encontramos un cupo activo para liberar. No hicimos ningún cambio.</p>',
    })
  }

  return page({
    eyebrow: 'Inscripción · Todos a Decathlon',
    title: 'El enlace no es válido',
    body: '<p style="margin:0;">Revisá que hayas abierto el botón del último email de Pasito. Tu inscripción no fue modificada.</p>',
  })
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function previewWithdrawal(token: string): Promise<WithdrawalResult> {
  const { data, error } = await getSupabaseAdmin().rpc('partner_event_preview_withdrawal', {
    p_token_hash: tokenHash(token),
  })
  if (error) throw error
  return (data ?? { status: 'invalid' }) as WithdrawalResult
}

async function withdraw(token: string): Promise<WithdrawalResult> {
  const { data, error } = await getSupabaseAdmin().rpc('partner_event_withdraw_registration', {
    p_token_hash: tokenHash(token),
  })
  if (error) throw error
  return (data ?? { status: 'invalid' }) as WithdrawalResult
}

function confirmationPage(result: WithdrawalResult, token: string): Response {
  const title = escapeHtml(result.title ?? 'Todos a Decathlon')
  const date = escapeHtml(formatEventDate(result.start_at))
  const address = escapeHtml(result.address ?? 'Vicente López, Buenos Aires')
  const refund = Math.max(Number(result.refunded_pasitos ?? 0), 0)

  return page({
    eyebrow: 'Confirmación de baja',
    title: '¿Querés liberar tu cupo?',
    body: `<p style="margin:0 0 12px;">Estás por cancelar tu inscripción a <strong>${title}</strong>.</p><p style="margin:0;">Hay mucha gente que se quedó afuera. Si confirmás, el lugar va a quedar disponible inmediatamente para otra persona.</p>`,
    panel: `<div style="margin-top:22px;padding:18px;border-radius:15px;background:#f2f5ec;color:#17382a;"><p style="margin:0 0 5px;font-weight:800;">${date}</p><p style="margin:0;">${address}</p>${refund > 0 ? `<p style="margin:9px 0 0;">También te devolvemos <strong>${refund} Pasitos</strong>.</p>` : ''}</div>`,
    form: `<form method="post" action="${PAGE_PATH}" style="margin-top:24px;"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit" style="box-sizing:border-box;width:100%;padding:15px 18px;border:0;border-radius:999px;background:#0c6b45;color:#fff;font:inherit;font-weight:850;cursor:pointer;">Confirmar: liberar mi cupo</button></form><p style="margin:13px 0 0;text-align:center;color:#6a786f;font-size:13px;">Si cambiás de idea, cerrá esta página. Tu cupo seguirá confirmado.</p>`,
  })
}

function testPreviewPage(): Response {
  return page({
    eyebrow: 'Prueba segura · No modifica inscripciones',
    title: '¿Querés liberar tu cupo?',
    body: '<p style="margin:0 0 12px;">En el email real, cada persona llega a esta confirmación antes de darse de baja.</p><p style="margin:0;">El lugar se libera únicamente después de presionar el botón final. Esta prueba no está asociada a ninguna inscripción.</p>',
    panel: `<div style="margin-top:22px;padding:18px;border-radius:15px;background:#f2f5ec;color:#17382a;"><p style="margin:0 0 5px;font-weight:800;">${escapeHtml(formatEventDate())}</p><p style="margin:0;">Vicente López, Buenos Aires</p><p style="margin:9px 0 0;">En el flujo real se devuelven <strong>20 Pasitos</strong>.</p></div>`,
    form: '<button type="button" disabled style="box-sizing:border-box;width:100%;margin-top:24px;padding:15px 18px;border:0;border-radius:999px;background:#a6b3ac;color:#fff;font:inherit;font-weight:850;">Confirmar: liberar mi cupo</button><p style="margin:13px 0 0;text-align:center;color:#6a786f;font-size:13px;">Botón deshabilitado porque este es el envío de prueba.</p>',
  })
}

function normalizedToken(value: string | null): string | null {
  const token = (value ?? '').trim().toLowerCase()
  return TOKEN_PATTERN.test(token) ? token : null
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    if (url.searchParams.get('preview') === '1') return testPreviewPage()

    const token = normalizedToken(url.searchParams.get('token'))
    if (!token) return invalidPage('invalid')

    const result = await previewWithdrawal(token)
    if (result.status !== 'ready') return invalidPage(result.status ?? 'invalid')
    return confirmationPage(result, token)
  } catch (error) {
    console.error('[decathlon-withdrawal:get]', error)
    return errorPage()
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData()
    const token = normalizedToken(String(form.get('token') ?? ''))
    if (!token) return invalidPage('invalid')

    const result = await withdraw(token)
    if (result.status !== 'withdrawn') return invalidPage(result.status ?? 'invalid')

    const refund = Math.max(Number(result.refunded_pasitos ?? 0), 0)
    const spotsLeft = typeof result.spots_left === 'number' ? result.spots_left : null
    return page({
      eyebrow: 'Baja confirmada',
      title: 'Gracias por liberar tu cupo',
      body: '<p style="margin:0;">Tu inscripción fue cancelada y el lugar ya está disponible para otra persona de la comunidad.</p>',
      panel: `<div style="margin-top:22px;padding:18px;border-radius:15px;background:#edf8f1;color:#17382a;"><p style="margin:0;font-weight:800;">${refund > 0 ? `Te devolvimos ${refund} Pasitos.` : 'La baja quedó registrada.'}</p>${spotsLeft === null ? '' : `<p style="margin:7px 0 0;">Cupos disponibles ahora: <strong>${spotsLeft}</strong>.</p>`}</div>`,
    })
  } catch (error) {
    console.error('[decathlon-withdrawal:post]', error)
    return errorPage()
  }
}

function errorPage(): Response {
  return page({
    eyebrow: 'Inscripción · Todos a Decathlon',
    title: 'No pudimos completar la acción',
    body: '<p style="margin:0;">No hicimos ningún cambio. Probá nuevamente en unos minutos o escribinos para que lo revisemos.</p>',
  })
}
