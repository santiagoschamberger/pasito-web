import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TOMATE_TICKET_BONUSES,
  tomateTicketTierIsSoldOut,
  type TicketInventoryTier,
} from '../lib/tomate-event.ts'

const inventoryTier = (
  position: number,
  available: number | null,
  capacity: number | null = 100,
): TicketInventoryTier => ({
  tierId: position,
  position,
  name: `Tanda ${position}`,
  unitPrice: position * 10000,
  capacity,
  sold: capacity === null || available === null ? 0 : capacity - available,
  held: 0,
  available,
})

test('the first tier stays visibly sold out if live inventory cannot load', () => {
  assert.equal(tomateTicketTierIsSoldOut(1, []), true)
  assert.equal(tomateTicketTierIsSoldOut(2, []), false)
})

test('the final ticket tier is displayed at ARS 48,000', () => {
  const finalTier = TOMATE_TICKET_BONUSES.find((tier) => tier.position === 3)

  assert.equal(finalTier?.unitPrice, 48000)
})

test('live inventory overrides the fallback and marks any finite tier at zero as sold out', () => {
  assert.equal(tomateTicketTierIsSoldOut(1, [inventoryTier(1, 1)]), false)
  assert.equal(tomateTicketTierIsSoldOut(2, [inventoryTier(2, 0)]), true)
  assert.equal(tomateTicketTierIsSoldOut(3, [inventoryTier(3, null, null)]), false)
})
