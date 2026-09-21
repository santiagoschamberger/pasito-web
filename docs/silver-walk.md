# Silver Walks by Nutren

Route: `/silver`. Implementation branch: `codex/silver-walk-redesign`.

## Event facts

Preserves the existing event configuration: September 27, 2026; 09:30–13:00; Augusta, Av. Ernesto Tornquist 6385, CABA; ARS 45,000; 200 places; maximum six tickets per purchase. The database inventory is authoritative. The user confirmed the date, audience aged 45 and above, without an upper age limit, monthly cadence, and sponsors. Payment of the venue remains an internal operational item, not public page copy.

## Credentials and operation

- `NEXT_PUBLIC_SILVER_REBILL_PUBLIC_KEY`: dedicated Silver public key.
- `SILVER_REBILL_SECRET_KEY`: matching private key, server only. Never falls back to the store or TOMATE accounts.
- `SILVER_REBILL_WEBHOOK_SECRET`: optional separate secret for `/api/rebill/webhook/{secret}`. Existing webhook secrets continue to work. Configure payment.created and payment.updated in the Silver Rebill account.
- `EVENT_TICKET_SIGNING_SECRET`: existing production signing secret, at least 32 characters. Preserve it; changing it invalidates issued tickets. A separate development secret is used locally.
- Existing Supabase and Resend configuration is reused.
- `TYPESAFE_API_KEY`: enables the FAQ search. If absent, the full FAQ remains available and the AI search is hidden. Never public. Model: `jev-latest`; one Choice selects from approved answers, including a no-match option. Confidence and probability thresholds are conservative initial values, not a guarantee of correctness. The visitor is told not to submit personal or health data. Questions are sent to TypeSafe, not logged or saved by this app. Per-instance request limiting is best effort; production infrastructure should enforce a global limit if traffic warrants it.

The supplied Rebill keys are installed in the ignored local environment only. Production deployment must provision the same Silver variables and confirm the account webhook. No real purchase, email, or database write is needed for local browser tests.

Silver confirmation now uses a dedicated email template and `/silver/ticket/[token]`. Signed ticket pages verify that the order belongs to Silver; other event tickets are rejected. Check-in operations are outside this redesign; the existing TOMATE check-in is scoped to its event, so Silver needs an event-specific staff check-in before event day.

## Asset sources

- Farmacity: https://www.farmacity.com/ (official header SVG).
- Exty: https://play.google.com/store/apps/details?id=ai.exty.app (official app icon, paired with the brand name).
- Nutren: https://www.nutren.com.co/ (official header SVG from the site's CSS; recolored with CSS).
- BNB: https://bnbproject.com.ar/ (official store logo).
- Yerba Cósmico: https://www.yerbacosmico.com/ (official store logo).
- Kiwell and Augusta photographs: existing repository assets.
- `walk-photo.webp`: AI-assisted removal of lettering/logos from the existing Silver poster, with exposure adjustment. It is not a new documentary event photograph. Original source remains `hero.jpg`.

## Verification

Run the repository test suite, `node --experimental-strip-types --test tests/silver-*.test.mts`, a production build, and browser checks at 1440px and 390px (including no horizontal overflow, images, FAQ, quantity/total, terms, payment success/pending/failure, and sold-out state). Mock the payment and reservation transports for the browser purchase flow; do not charge a card or send mail in tests.

### Verified in this change

- 84 unit/regression tests passed (78 existing + 6 Silver).
- Production compilation and TypeScript passed. Standalone `tsc` still reports the existing missing `@playwright/test` dependency in unrelated reservation tests.
- Isolated Playwright checks passed: totals, quantity limit, required terms, dedicated Rebill public key, metadata/amount, declined card, successful receipt, pending confirmation preventing repayment, reservation error, sold out, FAQ, images, 320/390/1440px overflow, and no page errors. Reservation/confirmation traffic was intercepted in the isolated browser.
- Six live TypeSafe cases passed: location, price, going alone, unknown weather, medical-advice request, and attempted price manipulation. Observed response times were 0.3–1.3 seconds; these are local samples, not a latency guarantee.
- An earlier browser tool did not preserve request mocks across reloads and created temporary test holds. No charge or email occurred. The known outstanding hold was released using its signed cancellation endpoint; subsequent inventory confirmed sold=0, held=0, available=200.
- No secret key found in generated client assets.
- `/eventos` added with a Silver listing and links in desktop/mobile marketing navigation. Publication to the mobile app's event catalog is a separate operation, not performed by this website change.
- Final production preview passed: Silver desktop/mobile images and layout, `/eventos` → Silver navigation, both homepage event links, invalid signed-ticket URL returns 404, and no JavaScript errors. Preview is served locally on port 3113.
- Read-only Rebill lookup of a nonexistent payment returned HTTP 404 (not an authentication rejection). This is not a real payment settlement test.
