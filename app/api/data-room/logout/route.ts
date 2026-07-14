import { NextResponse } from 'next/server'
import {
  DATA_ROOM_COOKIE,
  getDataRoomClient,
  hashSessionToken,
} from '@/lib/data-room/server'

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DATA_ROOM_COOKIE}=`))
    ?.slice(DATA_ROOM_COOKIE.length + 1)

  if (token) {
    await getDataRoomClient()
      .from('brand_data_room_sessions')
      .delete()
      .eq('token_hash', hashSessionToken(decodeURIComponent(token)))
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(DATA_ROOM_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
