/**
 * Playwright E2E tests for the partner reservation confirmation page.
 *
 * Prerequisites:
 *   1. Next.js dev server running:  npm run dev
 *   2. Supabase Edge Functions deployed (or local via `supabase functions serve`)
 *   3. Environment variables set:
 *      - NEXT_PUBLIC_SUPABASE_URL
 *      - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   4. A test reservation created via request-reservation Edge Function
 *      producing a valid token
 *
 * Run:
 *   npx playwright test tests/reservation-flow.spec.ts
 *
 * To generate a valid test token, call:
 *   curl -X POST $SUPABASE_URL/functions/v1/request-reservation \
 *     -H "Authorization: Bearer $USER_JWT" \
 *     -H "Content-Type: application/json" \
 *     -d '{"reward_id": "<PENDING_CONFIRMATION_REWARD_ID>"}'
 *
 * The response includes a `token` field and a `confirmation_url` like:
 *   https://pasito.app/r/<TOKEN>
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// Set these env vars before running, or replace with real values for manual testing
const VALID_TOKEN = process.env.TEST_VALID_TOKEN ?? ''
const EXPIRED_TOKEN = process.env.TEST_EXPIRED_TOKEN ?? ''

test.describe('Partner reservation page', () => {
  test.describe('Invalid/missing token', () => {
    test('shows error page for garbage token', async ({ page }) => {
      await page.goto(`${BASE}/r/this-is-not-a-real-token`)
      await expect(page.getByText('Link inválido')).toBeVisible()
      await expect(page.getByText('no es válido')).toBeVisible()
    })

    test('shows error page for empty token path', async ({ page }) => {
      await page.goto(`${BASE}/r/`)
      // Should 404 or show error
      await expect(
        page.getByText('Link inválido').or(page.getByText('404')),
      ).toBeVisible()
    })
  })

  test.describe('Valid pending token', () => {
    test.skip(!VALID_TOKEN, 'TEST_VALID_TOKEN not set')

    test('GET renders reservation preview without consuming it', async ({
      page,
    }) => {
      await page.goto(`${BASE}/r/${VALID_TOKEN}`)

      await expect(page.getByText('Nueva reserva')).toBeVisible()
      await expect(page.getByText('Servicio')).toBeVisible()
      await expect(page.getByText('Cliente')).toBeVisible()
      await expect(page.getByText('Pasitos')).toBeVisible()
      await expect(page.getByText('Confirmar reserva')).toBeVisible()
      await expect(page.getByText('Rechazar reserva')).toBeVisible()
    })

    test('second GET still shows pending (idempotent preview)', async ({
      page,
    }) => {
      await page.goto(`${BASE}/r/${VALID_TOKEN}`)
      await expect(page.getByText('Nueva reserva')).toBeVisible()

      // Reload — still pending
      await page.reload()
      await expect(page.getByText('Nueva reserva')).toBeVisible()
    })
  })

  test.describe('Confirm flow', () => {
    test.skip(!VALID_TOKEN, 'TEST_VALID_TOKEN not set')

    test('POST confirm → redirects to done page with confirmed status', async ({
      page,
    }) => {
      await page.goto(`${BASE}/r/${VALID_TOKEN}`)
      await page.getByText('Confirmar reserva').click()

      await page.waitForURL(/\/done/)
      await expect(page.getByText('¡Reserva confirmada!')).toBeVisible()
      await expect(page.getByText('pasitos se descontaron')).toBeVisible()
    })

    test('revisiting same token shows "Ya confirmada"', async ({ page }) => {
      await page.goto(`${BASE}/r/${VALID_TOKEN}`)
      await expect(page.getByText('Ya confirmada')).toBeVisible()
    })
  })

  test.describe('Reject flow (requires separate token)', () => {
    const REJECT_TOKEN = process.env.TEST_REJECT_TOKEN ?? ''
    test.skip(!REJECT_TOKEN, 'TEST_REJECT_TOKEN not set')

    test('POST reject → redirects to done page with rejected status', async ({
      page,
    }) => {
      await page.goto(`${BASE}/r/${REJECT_TOKEN}`)
      await page.getByText('Rechazar reserva').click()

      await page.waitForURL(/\/done/)
      await expect(page.getByText('Reserva rechazada')).toBeVisible()
      await expect(page.getByText('pasitos fueron devueltos')).toBeVisible()
    })
  })

  test.describe('Expired token', () => {
    test.skip(!EXPIRED_TOKEN, 'TEST_EXPIRED_TOKEN not set')

    test('shows expired message', async ({ page }) => {
      await page.goto(`${BASE}/r/${EXPIRED_TOKEN}`)
      await expect(page.getByText('Expirada')).toBeVisible()
    })
  })
})
