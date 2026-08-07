import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../supabase/migrations/20260804223227_partner_event_confirmation_withdrawals.sql', import.meta.url),
  'utf8',
)
const edgeFunction = readFileSync(
  new URL('../supabase/functions/partner-event-registration/index.ts', import.meta.url),
  'utf8',
)
const webRoute = readFileSync(
  new URL('../app/eventos/decathlon/baja/route.ts', import.meta.url),
  'utf8',
)
const sender = readFileSync(
  new URL('../scripts/send-decathlon-registration-confirmations.mts', import.meta.url),
  'utf8',
)

test('withdrawal is atomic, idempotent and refunds Pasitos while opening capacity', () => {
  assert.match(migration, /from public\.partner_events event[\s\S]*for update/)
  assert.match(migration, /from public\.partner_event_participants participant[\s\S]*for update/)
  assert.match(migration, /perform public\.refund_pasitos/)
  assert.match(migration, /set status = 'refunded'/)
  assert.match(migration, /participant_count = greatest\(participant_count - 1, 0\)/)
  assert.match(migration, /pasitos_pool = greatest\(pasitos_pool - v_participant\.entry_cost_paid, 0\)/)
  assert.match(migration, /on conflict \(idempotency_key\) do nothing/)
  assert.match(migration, /v_delivery\.withdrawn_at is not null or v_participant\.status = 'refunded'/)
})

test('delivery table and privileged functions stay private to service_role', () => {
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all on table public\.partner_event_confirmation_deliveries[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /revoke all on function public\.partner_event_withdraw_registration\(text\)[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.partner_event_withdraw_registration\(text\)[\s\S]*to service_role/)
  assert.match(migration, /extensions\.digest\(generated\.raw_token, 'sha256'\)/)
})

test('opening the email link cannot withdraw; only the confirmation POST mutates', () => {
  assert.match(edgeFunction, /PUBLIC_PAGE_URL = 'https:\/\/pasito\.app\/eventos\/decathlon\/baja'/)
  assert.match(edgeFunction, /request\.method === 'GET'[\s\S]*redirectToPublicPage/)
  assert.match(edgeFunction, /request\.method === 'POST'[\s\S]*303/)
  assert.doesNotMatch(edgeFunction, /partner_event_withdraw_registration/)

  assert.match(webRoute, /export async function GET[\s\S]*previewWithdrawal\(token\)/)
  assert.match(webRoute, /export async function POST[\s\S]*withdraw\(token\)/)
  assert.match(webRoute, /form method="post"/)
  assert.match(webRoute, /Referrer-Policy': 'no-referrer'/)
  assert.match(webRoute, /Cache-Control': 'no-store/)
  assert.match(webRoute, /Content-Type': 'text\/html; charset=utf-8'/)
})

test('bulk sender requires the explicit sendable-recipient count and supports safe test mode', () => {
  assert.match(sender, /--send-all --confirm-count=<audiencia exacta>/)
  assert.match(sender, /Number\.isInteger\(expectedRecipients\)/)
  assert.match(sender, /p_limit: Math\.min\(25, remainingRecipients\)/)
  assert.match(sender, /--test-email=email/)
  assert.match(sender, /preview=1/)
  assert.match(sender, /partner_event_record_confirmation_email_attempt/)
  assert.match(sender, /Pasito <soporte@pasito\.app>/)
  assert.match(sender, /const CAMPAIGN = 'attendance_reminder_2026_08_07'/)
})
