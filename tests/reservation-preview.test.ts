import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizePreviewResponse } from '../app/r/[token]/reservation-preview.ts'

test('normalizes the coupon-preview Edge Function contract', () => {
  const preview = normalizePreviewResponse({
    coupon_id: 'coupon-123',
    status: 'pending_confirmation',
    client_first_name: 'Santi S.',
    reward_title: 'Masaje deportivo',
    partner_name: 'Cuervo Cafe',
    expires_at: '2026-05-10T19:30:00.000Z',
    pasitos_spent: 120,
  })

  assert.deepEqual(preview, {
    couponId: 'coupon-123',
    status: 'pending_confirmation',
    clientFirstName: 'Santi S.',
    rewardTitle: 'Masaje deportivo',
    partnerName: 'Cuervo Cafe',
    expiresAt: '2026-05-10T19:30:00.000Z',
    pasitosCost: 120,
  })
})

test('rejects malformed preview payloads instead of rendering broken data', () => {
  assert.equal(
    normalizePreviewResponse({
      coupon_id: 'coupon-123',
      status: 'unknown',
      client_first_name: 'Santi S.',
      reward_title: 'Masaje deportivo',
      expires_at: '2026-05-10T19:30:00.000Z',
      pasitos_spent: 120,
    }),
    null,
  )

  assert.equal(
    normalizePreviewResponse({
      status: 'pending_confirmation',
      client_first_name: 'Santi S.',
      reward_title: 'Masaje deportivo',
      expires_at: '2026-05-10T19:30:00.000Z',
      pasitos_spent: 120,
    }),
    null,
  )
})

test('maps confirmed coupon status used to the page confirmed state', () => {
  const preview = normalizePreviewResponse({
    coupon_id: 'coupon-123',
    status: 'used',
    client_first_name: 'Santi S.',
    reward_title: 'Masaje deportivo',
    partner_name: 'Cuervo Cafe',
    expires_at: '2026-05-10T19:30:00.000Z',
    pasitos_spent: 120,
  })

  assert.equal(preview?.status, 'confirmed')
})
