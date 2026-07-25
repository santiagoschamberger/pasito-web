import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TOMATE_TICKET_BONUSES,
  tomateEventIsSoldOut,
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

test('every tier stays sold out if live inventory cannot load after sales close', () => {
  assert.equal(tomateTicketTierIsSoldOut(1, []), true)
  assert.equal(tomateTicketTierIsSoldOut(2, []), true)
  assert.equal(tomateTicketTierIsSoldOut(3, []), true)
})

test('the final ticket tier is displayed at ARS 48,000', () => {
  const finalTier = TOMATE_TICKET_BONUSES.find((tier) => tier.position === 3)

  assert.equal(finalTier?.unitPrice, 48000)
  assert.equal(finalTier?.capacity, 39)
  assert.match(finalTier?.label ?? '', /39 cupos/i)
})

test('live inventory overrides the fallback and marks any finite tier at zero as sold out', () => {
  assert.equal(tomateTicketTierIsSoldOut(1, [inventoryTier(1, 1)]), false)
  assert.equal(tomateTicketTierIsSoldOut(2, [inventoryTier(2, 0)]), true)
  assert.equal(tomateTicketTierIsSoldOut(3, [inventoryTier(3, null, null)]), false)
})

test('the explicit sales closure keeps the event sold out even with stale inventory', () => {
  assert.equal(tomateEventIsSoldOut([]), true)
  assert.equal(tomateEventIsSoldOut([
    inventoryTier(1, 0),
    inventoryTier(2, 0),
    inventoryTier(3, 1, 50),
  ]), true)
  assert.equal(tomateEventIsSoldOut([
    inventoryTier(1, 0),
    inventoryTier(2, 0),
    inventoryTier(3, 0, 50),
  ]), true)
})
