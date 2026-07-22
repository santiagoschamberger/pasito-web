import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const checkout = readFileSync(new URL('../app/evento-pasito/TicketCheckout.tsx', import.meta.url), 'utf8')
const endpoint = readFileSync(new URL('../app/api/events/tomate/checkout-intents/route.ts', import.meta.url), 'utf8')
const eventPage = readFileSync(new URL('../app/evento-pasito/page.tsx', import.meta.url), 'utf8')
const terms = readFileSync(new URL('../content/terminos-evento-pasito.txt', import.meta.url), 'utf8')

test('ticket checkout requires explicit acceptance of the event terms', () => {
  assert.match(checkout, /type="checkbox"/)
  assert.match(checkout, /disabled=\{preparing \|\| !termsAccepted\}/)
  assert.match(checkout, /href=\{TOMATE_EVENT_TERMS_PATH\}/)
  assert.match(checkout, /Acepto los\{' '\}/)
  assert.doesNotMatch(checkout, /mayor de 18 años/i)
  assert.match(endpoint, /body\.termsAccepted !== true/)
  assert.match(endpoint, /terms_accepted_at/)
  assert.match(endpoint, /terms_version/)
})

test('published event terms include the material participation conditions', () => {
  assert.doesNotMatch(terms, /dieciocho \(18\) años|menores de edad|mayor(?:es)? de edad/i)
  assert.match(terms, /DATOS PERSONALES Y CONSENTIMIENTO PARA SU COMUNICACIÓN A LOS SPONSORS/i)
  assert.match(terms, /CANCELACIONES, REEMBOLSOS Y CAMBIOS DE TITULARIDAD/i)
  assert.match(terms, /Última actualización: Julio de 2026/i)
})

test('event page publishes the included menu, product kit and purchase raffles', () => {
  assert.doesNotMatch(eventPage, /almuerzo/i)
  assert.match(eventPage, /Brunch buffet en TOMATE/)
  assert.match(eventPage, /Cuadrados de pastaflora/)
  assert.match(eventPage, /Café de especialidad, Familia Cabrales \(espresso y cortado\)/)
  assert.match(eventPage, /Kit de productos incluido/)
  assert.match(eventPage, /relojes Garmin y kits de productos Decathlon/)
})

test('new sponsor logos lead the event sponsor list with Decathlon first', () => {
  assert.match(eventPage, /const SPONSORS:[\s\S]*name: 'Decathlon'[\s\S]*name: 'Garmin'[\s\S]*name: 'Aurum'[\s\S]*name: 'Benevia Natural Brands'[\s\S]*name: 'Flux/)
  assert.match(eventPage, /\/evento-pasito\/sponsors\/decathlon\.jpg/)
  assert.match(eventPage, /\/evento-pasito\/sponsors\/garmin\.png/)
})
