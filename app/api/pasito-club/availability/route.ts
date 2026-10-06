import { NextResponse } from 'next/server'

import { pasitoClubStore } from '@/lib/pasito-club-server'

export const revalidate = 0

export async function GET() {
  try {
    const dates = await pasitoClubStore().inventory()
    return NextResponse.json({ dates }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('[pasito-club/availability] Error:', error)
    return NextResponse.json({ error: 'No pudimos cargar los cupos.' }, { status: 500 })
  }
}
