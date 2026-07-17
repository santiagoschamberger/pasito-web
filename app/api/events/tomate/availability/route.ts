import { NextResponse } from 'next/server'

import { TOMATE_EVENT, type TicketInventoryTier } from '@/lib/tomate-event'
import { getTomateSupabase } from '@/lib/tomate-server'

export const dynamic = 'force-dynamic'

type InventoryRow = {
  tier_id: number | string
  tier_position: number
  tier_name: string
  unit_price: number
  capacity: number | null
  sold: number
  held: number
  available: number | null
}

export async function GET() {
  try {
    const { data, error } = await getTomateSupabase().rpc('event_ticket_inventory', {
      p_event_slug: TOMATE_EVENT.slug,
    })
    if (error) throw error

    const tiers: TicketInventoryTier[] = ((data ?? []) as InventoryRow[]).map((row) => ({
      tierId: Number(row.tier_id),
      position: Number(row.tier_position),
      name: row.tier_name,
      unitPrice: Number(row.unit_price),
      capacity: row.capacity === null ? null : Number(row.capacity),
      sold: Number(row.sold),
      held: Number(row.held),
      available: row.available === null ? null : Number(row.available),
    }))

    return NextResponse.json({ tiers }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[tomate/availability] No se pudo leer el inventario:', error)
    return NextResponse.json({ error: 'No pudimos consultar las entradas.' }, { status: 500 })
  }
}
