import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dataSource = readFileSync(
  new URL('../app/challenges/challenges-data.ts', import.meta.url),
  'utf8',
)
const detailPage = readFileSync(
  new URL('../app/challenges/[id]/page.tsx', import.meta.url),
  'utf8',
)
const nextConfig = readFileSync(
  new URL('../next.config.mjs', import.meta.url),
  'utf8',
)
const robots = readFileSync(
  new URL('../public/robots.txt', import.meta.url),
  'utf8',
)

test('public names are restricted to the requested campaign and visible winners', () => {
  assert.match(dataSource, /PUBLIC_WINNER_NAMES\.has\(id\)/)
  assert.match(dataSource, /\.eq\('hide_from_leaderboard', false\)/)
  assert.match(dataSource, /\.select\('id, display_name'\)/)
  assert.doesNotMatch(dataSource, /\bbarrio\b|\bemail\b|\bphone\b/)
  assert.doesNotMatch(detailPage, /winner\.barrio|winner\.userId/)
  assert.match(detailPage, /Ganador\/a \$\{index \+ 1\}/)
})

test('challenge detail pages send crawler de-indexing directives', () => {
  assert.match(detailPage, /robots:\s*\{/)
  assert.match(detailPage, /index:\s*false/)
  assert.match(detailPage, /follow:\s*false/)
  assert.match(detailPage, /noarchive:\s*true/)
  assert.match(nextConfig, /source:\s*['"]\/challenges\/:id['"]/)
  assert.match(nextConfig, /X-Robots-Tag/)
  assert.match(nextConfig, /noindex, nofollow, noarchive, nosnippet/)
})

test('the site serves an explicit robots.txt instead of a 404', () => {
  assert.match(robots, /^User-agent:\s*\*/m)
  assert.match(robots, /^Allow:\s*\/$/m)
})
