import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

test('shirt confirmations are tracked for every delivery type and retried on duplicate callbacks', async () => {
  const [route, migration] = await Promise.all([
    read('../app/api/orders/route.ts'),
    read('../supabase/migrations/20260720193544_track_transactional_email_attempts.sql'),
  ])

  assert.match(route, /result !== 'confirmed' && result !== 'duplicate'/)
  assert.match(route, /confirmation_email_sent_at/)
  assert.match(route, /retryEmailDelivery/)
  assert.match(route, /tienda_record_confirmation_email_attempt/)
  assert.match(route, /emailPending/)
  assert.match(migration, /confirmation_email_attempts/)
  assert.match(migration, /create or replace function public\.tienda_record_confirmation_email_attempt/)
})

test('ticket confirmation failures remain pending and make the Rebill webhook retry', async () => {
  const [route, webhook, migration] = await Promise.all([
    read('../app/api/events/tomate/orders/confirm/route.ts'),
    read('../app/api/rebill/webhook/[secret]/route.ts'),
    read('../supabase/migrations/20260720193544_track_transactional_email_attempts.sql'),
  ])

  assert.match(route, /retryEmailDelivery/)
  assert.match(route, /event_record_confirmation_email_attempt/)
  assert.match(route, /emailPending = false/)
  assert.match(webhook, /hasPendingEmail/)
  assert.match(webhook, /status: 503/)
  assert.match(migration, /create or replace function public\.event_record_confirmation_email_attempt/)
})
