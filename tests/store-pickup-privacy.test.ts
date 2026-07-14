import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const publicPickupSources = [
  '../app/tienda/StoreClient.tsx',
  '../app/api/orders/route.ts',
  '../lib/store-fulfillment.ts',
  '../lib/store-pickup-email.ts',
  '../docs/DOCUMENTACION_REPO.md',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

test('the former pickup street address is never exposed by the store', () => {
  assert.doesNotMatch(publicPickupSources, /Gallo\s+1645/i)
  assert.match(publicPickupSources, /Retiro coordinado/)
  assert.match(publicPickupSources, /coordinar el punto.*horario/i)
})
