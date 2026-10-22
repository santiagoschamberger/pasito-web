import { NextResponse } from 'next/server'

import { db, handleError, requireUser } from '@/lib/gestion/server'

// Tandas de entradas vendidas en la web, para vincular a un evento.
export async function GET() {
  try {
    await requireUser()
    const { data, error } = await db().rpc('gestion_web_tier_options')
    if (error) throw error
    return NextResponse.json({ tiers: data ?? [] })
  } catch (error) {
    return handleError(error)
  }
}
