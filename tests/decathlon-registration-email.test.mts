import assert from 'node:assert/strict'
import test from 'node:test'

import { renderDecathlonRegistrationEmail } from '../lib/decathlon-registration-email.ts'

test('confirmation email includes the event, capacity message and safe withdrawal CTA', () => {
  const email = renderDecathlonRegistrationEmail({
    displayName: 'Santiago',
    withdrawalUrl: 'https://example.test/withdraw?token=abc123',
  })

  assert.equal(email.subject, 'Inscripción confirmada · Todos a Decathlon')
  assert.match(email.html, /¡Tu inscripción está confirmada!/)
  assert.match(email.html, /Los 460 cupos se completaron y mucha gente quedó afuera/)
  assert.match(email.html, /No puedo asistir, quiero liberar mi cupo/)
  assert.match(email.html, /te devolvemos los 20 Pasitos/)
  assert.match(email.html, /una última confirmación/)
  assert.match(email.text, /https:\/\/example\.test\/withdraw\?token=abc123/)
})

test('email escapes personalized and URL content', () => {
  const email = renderDecathlonRegistrationEmail({
    displayName: '<Santi>',
    withdrawalUrl: 'https://example.test/?a=1&b="x"',
  })

  assert.doesNotMatch(email.html, /<Santi>/)
  assert.match(email.html, /&lt;Santi&gt;/)
  assert.match(email.html, /a=1&amp;b=&quot;x&quot;/)
})

test('test email is visibly marked and points at a non-mutating preview', () => {
  const email = renderDecathlonRegistrationEmail({
    withdrawalUrl: 'https://example.test/?preview=1',
    isTest: true,
  })

  assert.match(email.subject, /^\[PRUEBA\]/)
  assert.match(email.html, /no puede cancelar ninguna inscripción/i)
  assert.match(email.html, /preview=1/)
})

test('reminder email keeps the confirmed place and withdrawal CTA clear', () => {
  const email = renderDecathlonRegistrationEmail({
    displayName: 'Santiago',
    withdrawalUrl: 'https://example.test/withdraw?token=reminder123',
    isReminder: true,
  })

  assert.equal(email.subject, 'Recordatorio · Todos a Decathlon')
  assert.match(email.html, /Tu lugar sigue confirmado/)
  assert.match(email.html, /Te recordamos que tenés tu lugar/)
  assert.match(email.html, /No puedo asistir, quiero liberar mi cupo/)
  assert.match(email.text, /reminder123/)
})
