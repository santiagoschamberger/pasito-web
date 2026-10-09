# Walking Club Uruguay — integration and deployment

Event: `pasito-walking-club-uy-2026`, Casa Fauno (Montevideo), October 25, 2026.
Prices are **major UYU units**, not cents: 1190 / 1290 / 1390, capacities 100 / 70 / 30.

## Confirmed production failure (2026-09-28)

Vercel logs show `checkout-intents` returning 500 with reservation status `not_found`.
A read-only database inspection confirmed there were no Uruguay tiers, no provider
tracking columns, and both intents and orders were restricted to ARS. The existing
reservation RPC hardcodes ARS. This prevents checkout before dLocal is called.

The original integration also selected nonexistent `customer_email` and ticket `code`
columns, called nonexistent `event_confirm_order`, linked nonexistent unsigned ticket
pages, and pointed to a webhook that had not been implemented. The success-page
order lookup also matched unrelated dLocal orders. These paths now use the actual
schema, signed tokens, scoped queries, and the existing atomic confirmation RPC.

## Configuration

Set `DLOCALGO_API_KEY` and `DLOCALGO_SECRET_KEY` to the pair for the selected environment.
Hosted checkout does not need a SmartFields key. Notification signatures use this
same API/secret pair; there is no separate webhook secret.

`DLOCALGO_ENVIRONMENT=production|sandbox` explicitly selects the provider endpoint.
Without an override, only `VERCEL_ENV=production` selects live payments. Vercel
previews and local development use sandbox even though builds set NODE_ENV=production.
For self-hosted production, set the explicit override.

Keep the existing Supabase service credentials, `EVENT_TICKET_SIGNING_SECRET` and
`RESEND_API_KEY`. `NEXT_PUBLIC_SITE_URL`, when set, must be the canonical public origin.
Do not infer validity from environment-variable names or from redacted/empty values
returned by an environment download. Verify via a deployed checkout request.

## Database

Apply the following migrations through the normal migration workflow (never reset production):

1. `20260928182538_fix_uruguay_checkout.sql`: allow UYU and add a service-role-only
   reservation wrapper that updates the intent and response to UYU in one transaction.
2. `20261001000000_uruguay_walking_club_event.sql`: seed Uruguay tiers.
3. `20261001000001_add_dlocal_payment_id.sql`: add provider tracking fields.

The shared ARS reservation and order-confirmation RPCs are preserved. dLocal orders
use `dlocalgo:<provider ID>` in the legacy `rebill_payment_id` column for atomic
idempotency, with the raw provider ID also stored in `dlocalgo_payment_id`.

## Notifications and tickets

Payment creation passes `/api/dlocalgo/webhook` as `notification_url`.
The handler authenticates the raw payload with dLocal's HMAC-SHA256 signature and
then fetches the payment from dLocal. Amount, currency, country, payment ID and
reservation ID must match before issuing tickets. Both redirect and webhook use the
same confirmation function. Notification retries recover pending email delivery.

Creation uses an atomic reservation claim to prevent concurrent duplicate checkouts.
A timeout leaves that claim in place because dLocal may have received the request;
a signed notification can attach the resulting payment. Do not blindly clear claims
and create another payment without reconciling the first attempt.

## Verification

- `npm test` includes mocked dLocal requests, signature/tampering checks, currency
  and reservation matching, expiry, concurrency, persistence failures and confirmation.
- `tests/uruguay-ticketing.sql` validates UYU persistence, wrong-currency rejection,
  duplicate confirmation, ticket counts, RPC permissions and ARS compatibility.
  Run inside a transaction with the migrations and **ROLLBACK**; no test orders remain.
- Build and browser-check the landing at mobile and desktop widths.
- Validate a sandbox purchase with sandbox keys and the provider's current test
  instructions. Never enter test cards into production checkout.
- Final live verification may create a checkout, but must stop before submitting payment.

Official dLocal references:
- https://docs.dlocalgo.com/integration-api/welcome-to-dlocal-go-api/authentication
- https://docs.dlocalgo.com/integration-api/welcome-to-dlocal-go-api/payments/create-a-payment
- https://docs.dlocalgo.com/integration-api/welcome-to-dlocal-go-api/payments/notifications
