import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const store = readFileSync(new URL('../app/tienda/StoreClient.tsx', import.meta.url), 'utf8')
const ordersRoute = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')
const docs = readFileSync(new URL('../docs/DOCUMENTACION_REPO.md', import.meta.url), 'utf8')

test('the storefront and payment verification use the same shipping price', () => {
  assert.match(store, /const SHIPPING = 5000/)
  assert.match(ordersRoute, /const SHIPPING = 5000/)
  assert.match(docs, /Envio a domicilio: `5000`/)
})
