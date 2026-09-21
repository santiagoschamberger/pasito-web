import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { selectSilverFaq, silverFaqRequest } from '@/lib/silver-faq'

// Best-effort per-instance protection; no user questions or IP addresses are retained.
const limits = new Map<string, { count: number; until: number }>()
export async function POST(request: NextRequest) {
  const key = process.env.TYPESAFE_API_KEY?.trim()
  if (!key)
    return NextResponse.json(
      {
        error:
          'La búsqueda no está disponible. Consultá las preguntas de abajo.',
      },
      { status: 503 },
    )
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin)
    return new NextResponse(null, { status: 403 })
  const id = createHash('sha256')
    .update(request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown')
    .digest('hex')
  const now = Date.now()
  for (const [ip, limit] of limits) if (limit.until <= now) limits.delete(ip)
  const limit = limits.get(id)
  if ((limit && limit.count >= 8) || (!limit && limits.size >= 2000))
    return NextResponse.json(
      { error: 'Probá más tarde o consultá las preguntas frecuentes.' },
      { status: 429 },
    )
  limits.set(id, {
    count: (limit?.count ?? 0) + 1,
    until: limit?.until ?? now + 60_000,
  })
  let query: string
  try {
    const raw = await request.text()
    if (raw.length > 2500) return new NextResponse(null, { status: 413 })
    const body = JSON.parse(raw)
    query = typeof body.query === 'string' ? body.query.trim() : ''
    if (query.length < 3 || query.length > 300)
      return NextResponse.json(
        { error: 'Escribí una pregunta de entre 3 y 300 caracteres.' },
        { status: 400 },
      )
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(silverFaqRequest(query)),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('TypeSafe unavailable')
    const faq = selectSilverFaq(await response.json())
    return NextResponse.json(
      { faq },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      {
        error:
          'No pudimos buscar en este momento. Podés consultar todas las respuestas abajo.',
      },
      { status: 503 },
    )
  }
}
