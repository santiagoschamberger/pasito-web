import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const policy = readFileSync(new URL('../app/privacidad/page.tsx', import.meta.url), 'utf8')

test('privacy discloses email providers, approximate measurement and retention', () => {
  for (const text of ['Versión 1.6', 'Amazon Simple Email Service (SES)', 'Railway', 'listmonk', 'apertura estimada', 'clics en enlaces', 'hasta 400 días', 'enlace de baja']) {
    assert.ok(policy.includes(text), `Missing disclosure: ${text}`)
  }
})

test('the newly published policy is effective on the actual publication date', () => {
  assert.match(policy, /Versión 1\.6 · Vigente desde el 16 de septiembre de 2026/)
})
