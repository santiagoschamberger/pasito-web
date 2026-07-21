import { NextResponse } from 'next/server'

import { getTomateTicketInventory } from '@/lib/tomate-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tiers = await getTomateTicketInventory()

    return NextResponse.json({ tiers }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[tomate/availability] No se pudo leer el inventario:', error)
    return NextResponse.json({ error: 'No pudimos consultar las entradas.' }, { status: 500 })
  }
}
