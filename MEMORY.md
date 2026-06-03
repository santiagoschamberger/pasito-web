# Pasito Waitlist Memory

Last updated: 2026-06-03 15:30 America/Argentina/Buenos_Aires.

## Project Context

- Repo: `/Users/santiago/Desktop/pasito-waitlist`.
- Production domain: `https://www.pasito.app`.
- Vercel project: `pasito-aa7e95c2/pasito-waitlist`.
- Git remote: `git@github.com:santiagoschamberger/pasito-waitlist.git`.
- Main app links served by this repo:
  - Friend group invites: `/g/[token]`.
  - Referral invites: `/i/[code]`.
  - Reservation links: `/r/[token]`.
  - Android connect guide: `/conectar-android`.
- Keep unrelated dirty files out of scoped fixes. The repo often has local uncommitted page/assets work.

## Link Routing Notes

- Mobile Pasito expects referral links as `https://www.pasito.app/i/<CODE>`.
- Mobile Pasito also accepts referral custom scheme links as `ar.pasito.pasito://i/<CODE>`.
- Android App Links use `public/.well-known/assetlinks.json`; do not replace it with a dynamic route unless the real SHA256 fingerprints are preserved.
- iOS Universal Links use `public/.well-known/apple-app-site-association`; it must include both `/g/*` and `/i/*`.

## Progress Log

- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Fixed, pushed, and deployed the production referral-link 404. Root cause: the deployed Vercel site for `www.pasito.app` did not include the public `/i/[code]` route even though the mobile app generated referral URLs as `https://www.pasito.app/i/<CODE>`. Before the fix, live `https://www.pasito.app/i/DA315F73` returned HTTP 404 with `x-matched-path: /404`, while `https://www.pasito.app/g/test-token` returned HTTP 200 with `x-matched-path: /g/[token]`, proving the domain and Vercel deployment were healthy but the referral route was missing.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Commit `d81f160 Add referral invite route` was created on `main` and pushed to `origin/main`. The commit intentionally includes only the scoped referral fix: `app/i/[code]/page.tsx`, `app/i/[code]/ReferralRedirect.tsx`, `app/i/[code]/referral-link.ts`, `tests/referral-link.test.ts`, and `public/.well-known/apple-app-site-association`. Unrelated dirty waitlist files were left unstaged.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Deployed from a temporary clean worktree at `HEAD` so production did not include unrelated local dirty files. Vercel production deployment: `https://pasito-waitlist-depzkuguy-pasito-aa7e95c2.vercel.app`; alias applied to `https://www.pasito.app`.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Verification passed. Local targeted checks: `node --experimental-strip-types --test tests/referral-link.test.ts` passed 2/2, local `.well-known` JSON parse passed, referral route smoke passed, and `git diff --check` passed for the scoped files. Local `npm run build` still hung after the initial Next banner for about 90 seconds and was killed; the remote Vercel build from clean `HEAD` passed compile and TypeScript. Live checks after deploy: `https://www.pasito.app/i/DA315F73` returns HTTP 200 with `x-matched-path: /i/[code]` and renders "Vos y tu amigo ganan 5 Pasitos"; `https://www.pasito.app/g/test-token` still returns HTTP 200 with `x-matched-path: /g/[token]`; live AASA contains both `/g/*` and `/i/*`; live `assetlinks.json` still contains the two real Android SHA256 fingerprints.

## Current Dirty State After Referral Fix

These files were present as unrelated local changes after the referral deploy and were not included in commit `d81f160`:

- Modified: `app/embajadores/page.tsx`.
- Modified: `app/privacidad/page.tsx`.
- Modified: `app/terminos/page.tsx`.
- Untracked: `app/.well-known/`.
- Untracked: `app/uruguay/UruguayWaitlistForm.tsx`.
- Untracked assets: `pasito-mobile-local-390.png`, `pasito-mobile-local.png`, `public/app-demo-compressed.mp4`, `public/favicon.svg`, `public/icons.svg`, `public/pasito.png`.
- Untracked Supabase temp: `supabase/.temp/`.
- Untracked tests: `tests/auth-confirm.test.ts`, `tests/reservation-flow.spec.ts`, `tests/reservation-preview.test.ts`.

## Operational Caveats

- `npm run build` can hang locally in this repo even when Vercel's remote build succeeds. For production deploys, prefer deploying from a clean worktree or clean clone at the intended commit and verify the remote Vercel build output.
- Do not deploy from the main local working tree when it has unrelated dirty files. Use a clean temporary worktree from `HEAD` to avoid shipping local assets/pages accidentally.
- For referral fixes, always verify both the page route and association files:
  - `curl -I https://www.pasito.app/i/<CODE>` should show HTTP 200 and `x-matched-path: /i/[code]`.
  - `curl https://www.pasito.app/.well-known/apple-app-site-association` should include `/i/*`.
  - `curl https://www.pasito.app/.well-known/assetlinks.json` should still include the real Android fingerprints.
