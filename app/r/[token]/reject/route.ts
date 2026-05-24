import { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://trsbowwcigzayhdpfxvd.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reject-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    })

    const status = res.ok ? 'rejected' : 'error'
    return redirect(`/r/${encodeURIComponent(token)}/done?status=${status}`)
  } catch {
    return redirect(`/r/${encodeURIComponent(token)}/done?status=error`)
  }
}

function redirect(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
