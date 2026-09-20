import { NextRequest, NextResponse } from 'next/server'

import { SILVER_EVENT, type TicketInventoryTier } from '@/lib/silver-event'
import { getSilverTicketInventory } from '@/lib/silver-server'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const tiers: TicketInventoryTier[] = await getSilverTicketInventory()
    return NextResponse.json({ tiers }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('[silver/availability] Error fetching inventory:', error)
    return NextResponse.json({ error: 'No pudimos cargar la disponibilidad.' }, { status: 500 })
  }
}
