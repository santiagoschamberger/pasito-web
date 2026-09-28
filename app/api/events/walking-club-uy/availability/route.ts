import { NextResponse } from 'next/server'

import { WALKING_CLUB_UY_EVENT, type TicketInventoryTier } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'

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
    const db = getWalkingClubUySupabase()
    const { data, error } = await db.rpc('event_ticket_inventory', {
      p_event_slug: WALKING_CLUB_UY_EVENT.slug,
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

    return NextResponse.json({ tiers }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('[walking-club-uy/availability] No se pudo consultar el inventario:', error)
    return NextResponse.json({ error: 'No pudimos consultar la disponibilidad.' }, { status: 500 })
  }
}
