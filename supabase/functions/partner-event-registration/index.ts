import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const PUBLIC_PAGE_URL = 'https://pasito.app/eventos/decathlon/baja'
const TOKEN_PATTERN = /^[a-f0-9]{64}$/

function normalizedToken(value: string | null): string | null {
  const token = (value ?? '').trim().toLowerCase()
  return TOKEN_PATTERN.test(token) ? token : null
}

function redirectToPublicPage(params: { token?: string | null; preview?: boolean }, status = 302): Response {
  const destination = new URL(PUBLIC_PAGE_URL)
  if (params.preview) destination.searchParams.set('preview', '1')
  if (params.token) destination.searchParams.set('token', params.token)

  return new Response(null, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Location: destination.toString(),
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url)

  if (request.method === 'GET') {
    return redirectToPublicPage({
      preview: url.searchParams.get('preview') === '1',
      token: normalizedToken(url.searchParams.get('token')),
    })
  }

  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null)
    return redirectToPublicPage({
      token: normalizedToken(String(form?.get('token') ?? '')),
    }, 303)
  }

  return new Response('Method not allowed', {
    status: 405,
    headers: { Allow: 'GET, POST' },
  })
})
