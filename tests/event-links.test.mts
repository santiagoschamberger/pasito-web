import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildEventLinks, normalizeEventId } from '../lib/event-links.ts'

const id = '03ba4342-ab89-4f43-982f-f66c88fd46c0'

test('event link retains the UUID through web, iOS and Android', () => {
  const links = buildEventLinks(id)
  assert.equal(links.publicUrl, `https://www.pasito.app/events/${id}`)
  assert.equal(links.appUrl, `ar.pasito.pasito://events/${id}`)
  assert.ok(links.androidIntent.startsWith(`intent://www.pasito.app/events/${id}#Intent;`))
  assert.ok(links.androidIntent.includes('package=ar.pasito.pasito;'))
  assert.ok(links.androidIntent.includes(`S.browser_fallback_url=${encodeURIComponent(links.playStoreUrl)};`))
  assert.ok(links.appStoreUrl.includes('/id6760863724'))
})

test('IDs normalize casing and reject arbitrary paths', () => {
  assert.equal(normalizeEventId(` ${id.toUpperCase()} `), id)
  for (const invalid of ['../auth', '', `${id}/extra`, 'https://example.com', 'invalid']) {
    assert.equal(normalizeEventId(invalid), null)
    assert.throws(() => buildEventLinks(invalid), /Invalid event ID/)
  }
})

test('Apple universal links include shared events', () => {
  const aasa = JSON.parse(readFileSync(new URL('../public/.well-known/apple-app-site-association', import.meta.url), 'utf8'))
  const paths = aasa.applinks.details.flatMap((detail: { components: { '/': string }[] }) => detail.components.map(component => component['/']))
  assert.ok(paths.includes('/events/*'))
  assert.ok(paths.includes('/challenges/*'))
})
