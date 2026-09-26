import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const silverEvent = readFileSync(new URL('../lib/silver-event.ts', import.meta.url), 'utf8')
const tomateEvent = readFileSync(new URL('../lib/tomate-event.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260721224620_record_event_terms_acceptance.sql', import.meta.url), 'utf8')

test('silver terms version matches YYYY-MM DB constraint format', () => {
  const silverMatch = silverEvent.match(/SILVER_EVENT_TERMS_VERSION = '(\d{4}-\d{2}(-\d{2})?)'/)
  assert.ok(silverMatch, 'SILVER_EVENT_TERMS_VERSION should be defined')
  
  const version = silverMatch[1]
  assert.match(version, /^\d{4}-\d{2}$/, 'SILVER_EVENT_TERMS_VERSION must match YYYY-MM format (no day suffix)')
  assert.doesNotMatch(version, /^\d{4}-\d{2}-\d{2}$/, 'SILVER_EVENT_TERMS_VERSION must not use YYYY-MM-DD format')
})

test('tomate terms version matches YYYY-MM DB constraint format', () => {
  const tomateMatch = tomateEvent.match(/TOMATE_EVENT_TERMS_VERSION = '(\d{4}-\d{2}(-\d{2})?)'/)
  assert.ok(tomateMatch, 'TOMATE_EVENT_TERMS_VERSION should be defined')
  
  const version = tomateMatch[1]
  assert.match(version, /^\d{4}-\d{2}$/, 'TOMATE_EVENT_TERMS_VERSION must match YYYY-MM format')
})

test('migration constraint enforces YYYY-MM format', () => {
  assert.match(migration, /terms_version ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}\$'/, 'Migration should enforce YYYY-MM format')
})

test('silver checkout route uses consistent terms version', () => {
  const checkoutRoute = readFileSync(new URL('../app/api/events/silver/checkout-intents/route.ts', import.meta.url), 'utf8')
  assert.match(checkoutRoute, /SILVER_EVENT_TERMS_VERSION/, 'Checkout route should use SILVER_EVENT_TERMS_VERSION constant')
})
