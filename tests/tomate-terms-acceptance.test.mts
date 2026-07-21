import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const checkout = readFileSync(new URL('../app/evento-pasito/TicketCheckout.tsx', import.meta.url), 'utf8')
const endpoint = readFileSync(new URL('../app/api/events/tomate/checkout-intents/route.ts', import.meta.url), 'utf8')
const terms = readFileSync(new URL('../content/terminos-evento-pasito.txt', import.meta.url), 'utf8')

test('ticket checkout requires explicit acceptance of the event terms', () => {
  assert.match(checkout, /type="checkbox"/)
  assert.match(checkout, /disabled=\{preparing \|\| !termsAccepted\}/)
  assert.match(checkout, /href=\{TOMATE_EVENT_TERMS_PATH\}/)
  assert.match(endpoint, /body\.termsAccepted !== true/)
  assert.match(endpoint, /terms_accepted_at/)
  assert.match(endpoint, /terms_version/)
})

test('published event terms include the material participation conditions', () => {
  assert.match(terms, /mayores de dieciocho \(18\) años/i)
  assert.match(terms, /DATOS PERSONALES Y CONSENTIMIENTO PARA SU COMUNICACIÓN A LOS SPONSORS/i)
  assert.match(terms, /CANCELACIONES, REEMBOLSOS Y CAMBIOS DE TITULARIDAD/i)
  assert.match(terms, /Última actualización: Julio de 2026/i)
})
