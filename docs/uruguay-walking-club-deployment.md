# Uruguay Walking Club - Deployment Guide

## Event Details

- **Event:** Pasito Walking Club Uruguay
- **Date:** Sábado 10 de octubre, 2026
- **Time:** 10:30 a 15:00
- **Venue:** Casa Fauno, Parque Rodó (Montevideo)
- **Route:** `/walking-club-uy`
- **Event Slug:** `pasito-walking-club-uy-2026`

## Pricing (UYU)

- **Tanda 1:** 100 entradas @ $1,190 UYU
- **Tanda 2:** 70 entradas @ $1,290 UYU  
- **Tanda 3:** 30 entradas @ $1,390 UYU
- **Total capacity:** 200 tickets

## Payment Integration: dLocal Go Hosted Checkout

This event uses **dLocal Go's Hosted Checkout** (redirect flow):

1. User selects tickets and accepts terms
2. System reserves tickets (5-minute hold)
3. User clicks "Ir al pago"
4. Backend creates dLocal Go payment → receives `redirect_url`
5. User redirects to dLocal Go's hosted checkout page
6. User completes payment on dLocal Go
7. dLocal Go redirects back to `/walking-club-uy/payment-success`
8. System verifies payment and displays QR tickets

### Why Hosted Checkout?
- ✅ Simplest integration (no SDK complexity)
- ✅ PCI compliance handled by dLocal Go
- ✅ Professional UX with 3DS authentication
- ✅ Mirrors existing Tomate/Rebill architecture

## Required Environment Variables for Vercel

### dLocal Go Credentials (REQUIRED)

```bash
DLOCALGO_API_KEY=<your-api-key>
DLOCALGO_SECRET_KEY=<your-secret-key>
DLOCALGO_WEBHOOK_SECRET=<your-webhook-secret>  # Optional but recommended
```

**How to get credentials:**

#### For Testing (Sandbox)
1. Create account: https://dashboard-sbx.dlocalgo.com/signup
2. Go to **Integrations** → **API Integration**
3. Copy **Sandbox API Key** and **Sandbox Secret Key**
4. Use sandbox API: `https://api-sbx.dlocalgo.com`

#### For Production (Live)
1. Create account: https://dashboard.dlocalgo.com/signup
2. Complete account verification (KYC)
3. Go to **Integrations** → **API Integration**
4. Copy **API Key** and **Secret Key**
5. Use production API: `https://api.dlocalgo.com`

### Existing Environment Variables (Already Configured)

These should already exist in your Vercel project:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Event Ticketing (QR codes, intents)
EVENT_TICKET_SIGNING_SECRET=<existing-secret>

# Email
RESEND_API_KEY=<existing-resend-key>

# Site
NEXT_PUBLIC_SITE_URL=https://pasito.app
```

## Vercel Deployment Steps

### 1. Add dLocal Go Environment Variables

In Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add the following variables:
   - `DLOCALGO_API_KEY` → Your API key (sandbox or production)
   - `DLOCALGO_SECRET_KEY` → Your secret key
   - `DLOCALGO_WEBHOOK_SECRET` → Random secure string (optional)
3. Select environments: **Production**, **Preview**, **Development**
4. Click **Save**

### 2. Database Migration

The database migrations are already included in the PR:
- `supabase/migrations/20261001000000_uruguay_walking_club_event.sql` — Event tiers
- `supabase/migrations/20261001000001_add_dlocal_payment_id.sql` — Payment tracking

Run migrations:
```bash
# If using Supabase CLI locally
supabase db reset

# Or apply manually in Supabase Studio:
# - Go to SQL Editor
# - Run migration files in order
```

### 3. Deploy

```bash
# Merge the PR (when ready)
git checkout main
git pull origin main

# Vercel will auto-deploy on merge
# Or trigger manual deployment:
vercel --prod
```

### 4. Testing

#### Test Cards (Sandbox)
Use these cards in sandbox environment:

**Successful Payments:**
- `4111 1111 1111 1111` — Visa (any future expiry, any CVV)
- `4242 4242 4242 4242` — Visa (any future expiry, any CVV)

**Declined Payments:**
- `5555 5555 5555 4444` — Rejected by bank
- `4000 0566 5566 5556` — Insufficient funds
- `5105 1051 0510 5100` — Invalid security code

#### Test Flow
1. Go to preview deployment: `https://your-preview.vercel.app/walking-club-uy`
2. Select 1 ticket, accept terms
3. Click "Continuar al pago"
4. Should see "Ir al pago" button with 5-minute timer
5. Click "Ir al pago" → redirects to dLocal Go
6. Use test card to complete payment
7. Should redirect back to `/walking-club-uy/payment-success`
8. Verify tickets display with QR codes

### 5. Webhook Configuration (Optional but Recommended)

Configure dLocal Go webhook for async payment notifications:

1. In dLocal Go dashboard: **Settings** → **Webhooks**
2. Add webhook URL: `https://pasito.app/api/dlocalgo/webhook/<DLOCALGO_WEBHOOK_SECRET>`
3. Select events:
   - `payment.paid`
   - `payment.cancelled`
   - `payment.refunded`
4. Save

**Note:** Webhook endpoint needs to be created (similar to `/api/rebill/webhook/[secret]`). This is optional for initial launch since the success page already verifies payment synchronously.

## Environment Detection

The code automatically detects environment:
- **Development/Preview:** Uses `https://api-sbx.dlocalgo.com` (sandbox)
- **Production:** Uses `https://api.dlocalgo.com` (live)

Detection is based on `NODE_ENV === 'production'`.

## Security Checklist

- ✅ No API secrets committed to git
- ✅ Payment provider ID stored in database for idempotency
- ✅ 5-minute ticket hold to prevent overselling
- ✅ Payment amount verification before order creation
- ✅ QR codes signed with EVENT_TICKET_SIGNING_SECRET
- ✅ Terms version tracked (2026-10)
- ✅ PCI compliance via dLocal Go hosted page

## Monitoring

### Check Payment Status
```sql
-- View recent payments
SELECT 
  id,
  event_slug,
  customer_email,
  amount,
  quantity,
  dlocalgo_payment_id,
  created_at
FROM event_ticket_orders
WHERE event_slug = 'pasito-walking-club-uy-2026'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Ticket Inventory
```sql
-- View current availability
SELECT * FROM event_ticket_inventory('pasito-walking-club-uy-2026');
```

### Check Failed Payments
```sql
-- View abandoned reservations
SELECT 
  id,
  amount,
  quantity,
  customer_email,
  payment_provider,
  payment_provider_id,
  status,
  expires_at
FROM event_checkout_intents
WHERE event_slug = 'pasito-walking-club-uy-2026'
  AND status = 'expired'
ORDER BY created_at DESC;
```

## Support

### dLocal Go Support
- Dashboard: https://dashboard.dlocalgo.com
- Docs: https://docs.dlocalgo.com
- Support: Via dashboard chat

### Pasito Support
- Email: hola@pasito.app
- Recovery page: `/walking-club-uy/entradas` (needs to be created if needed)

## Rollback Plan

If issues arise:

1. **Disable ticket sales:**
   ```sql
   UPDATE event_ticket_tiers
   SET capacity = 0
   WHERE event_slug = 'pasito-walking-club-uy-2026';
   ```

2. **Close sales in code:**
   ```typescript
   // In lib/uruguay-walking-club-event.ts
   export const WALKING_CLUB_UY_EVENT = {
     // ...
     salesClosed: true,  // Change to true
   }
   ```

3. **Revert deployment:**
   - Go to Vercel dashboard
   - Select previous deployment
   - Click "Promote to Production"

## Launch Checklist

Before opening sales:

- [ ] dLocal Go production credentials added to Vercel
- [ ] Database migrations applied
- [ ] Test purchase completed successfully in sandbox
- [ ] Email confirmation working
- [ ] QR tickets displaying correctly
- [ ] Terms page accessible at `/terminos/walking-club-uy`
- [ ] Landing page reviewed for typos/errors
- [ ] Pricing confirmed: $1,190 / $1,290 / $1,390 UYU
- [ ] Capacity confirmed: 100 / 70 / 30 tickets
- [ ] Customer support email configured
- [ ] Monitoring/alerts set up (optional)

## FAQ

### What happens if dLocal Go is down?
The checkout will fail gracefully with an error message. Users can try again later. Ticket reservations expire after 5 minutes automatically.

### Can we use this for other countries?
Yes! dLocal Go supports multiple LATAM countries. Just update the `country` parameter in the payment creation API call.

### How do refunds work?
dLocal Go supports refunds via API. Endpoint needs to be implemented: `/api/events/walking-club-uy/refunds/create`

### Can we change pricing after launch?
No, once tickets are sold at a tier price, that price is locked. You can close sold-out tiers or mark the event as sold out, but changing prices of active tiers is not recommended.
