# Pasito Web Memory

Last updated: 2026-07-10 19:10 America/Argentina/Buenos_Aires.

## Project Context

- Repo: `/Users/santiago/dev/pasito-web` (renombrado desde `pasito-waitlist` el 2026-07-10; GitHub mantiene redirects del nombre viejo).
- Production domain: `https://www.pasito.app`.
- Vercel project: `pasito-aa7e95c2/pasito-waitlist` (verificar que la conexión Git siga funcionando tras el rename; renombrar el proyecto Vercel es opcional).
- Git remote: `git@github.com:santiagoschamberger/pasito-web.git`.
- Este repo es la web pública completa: landing de consumidores (`/`), landing de comercios (`/comercios`, portada desde `pasito-dashboard` el 2026-07-10 — sus CTAs "Entrar"/"Sumar mi local" apuntan a `https://partners.pasito.app/login|/register`), embajadores, tienda, legales y deep links.
- Main app links served by this repo:
  - Friend group invites: `/g/[token]`.
  - Referral invites: `/i/[code]`.
  - Reservation links: `/r/[token]`.
  - Android connect guide: `/conectar-android`.
- OJO al commitear: `public/app-demo-compressed.mp4` está untracked y `/comercios` lo usa (video del mockup de teléfono).
- Keep unrelated dirty files out of scoped fixes. The repo often has local uncommitted page/assets work.

## DEEPLINKS CRÍTICOS — NO TOCAR NI ROMPER

Todo lo de esta sección impacta directamente la app mobile en producción. La app iOS/Android ya genera y consume estos links; cualquier cambio acá puede romper invitaciones, referidos, login y desafíos para usuarios reales. NO renombrar rutas, NO cambiar formatos de URL, NO borrar ni redirigir los archivos `.well-known`.

### Archivos de asociación (Apple / Google)

- `public/.well-known/apple-app-site-association` (iOS Universal Links):
  - App ID: `U8G7MYY9X8.ar.pasito.pasito`.
  - Paths que DEBE incluir: `/g/*`, `/i/*`, `/challenges`, `/challenges/*` (los de challenges están agregados localmente, pendientes de deploy).
  - No tiene extensión: `next.config.mjs` le fuerza `Content-Type: application/json`. No sacar ese header.
- `public/.well-known/assetlinks.json` (Android App Links):
  - Package: `ar.pasito.pasito`, relation `delegate_permission/common.handle_all_urls`.
  - Contiene DOS SHA256 fingerprints reales (`64:AD:5C:...:73:21` y `64:8C:C7:...:B5:DF`). Si se pierden, los App Links de Android dejan de verificar. No reemplazar por ruta dinámica.
- Ambos archivos deben responder HTTP 200 directo, sin redirect, TAMBIÉN en el apex `pasito.app`. El redirect apex→www de `next.config.mjs` tiene una excepción explícita para `/.well-known/...` — esa excepción es intocable: Apple y Google no siguen redirects al verificar, y la app comparte links como `https://pasito.app/g/<token>`.

### Rutas de deep link servidas por este repo

- `/g/[token]` — invitaciones a grupos de amigos (`app/g/[token]/`). La app genera `https://www.pasito.app/g/<token>` y `https://pasito.app/g/<token>`.
- `/i/[code]` — referidos (`app/i/[code]/`). URL canónica `https://www.pasito.app/i/<CODE>`; el código se normaliza (solo alfanumérico, uppercase) con `normalizeReferralCode`.
- `/challenges` y `/challenges/[id]` — desafíos públicos, ahora también Universal Link en el AASA local.
- `/r/[token]` — confirmación/rechazo de reservas de comercios (no es deep link a la app, pero el token viene de mails generados por Edge Functions; no cambiar el formato de ruta).
- `/auth-confirm` — puente de magic links. Solo permite redirect targets que empiecen con `ar.pasito.pasito://login-callback`. No aflojar esa validación ni cambiar el scheme.

### Formatos de URL que la app espera (no cambiar)

- Web referidos: `https://www.pasito.app/i/<CODE>`.
- Web grupos: `https://www.pasito.app/g/<token>`.
- Custom scheme iOS/Android: `ar.pasito.pasito://i/<CODE>`, `ar.pasito.pasito://g/<token>`, `ar.pasito.pasito://login-callback`.
- Android intent (Chrome): `intent://www.pasito.app/i/<CODE>#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=<encoded>;end` (ídem `/g/`).
- Play Store deferred referral: el fallback de Android lleva `referrer=pasito_referral_code%3D<CODE>` para no perder la atribución si el usuario instala desde Play Store. Lo construye `buildReferralPlayStoreUrl` en `app/i/[code]/referral-link.ts`.
- iOS fallback: custom scheme + espera de 1800 ms; si la página sigue visible va al App Store (cancelado por `visibilitychange` si la app abre).
- Bundle/package ID en todos lados: `ar.pasito.pasito`. Team ID Apple: `U8G7MYY9X8`.

### Cómo verificar antes/después de cualquier deploy

- `node --experimental-strip-types --test tests/referral-link.test.ts` (protege los formatos de referidos).
- `curl -I https://www.pasito.app/i/<CODE>` → 200 con `x-matched-path: /i/[code]`.
- `curl -I https://www.pasito.app/g/test-token` → 200 con `x-matched-path: /g/[token]`.
- `curl https://pasito.app/.well-known/apple-app-site-association` (apex, sin redirect) → JSON con `/g/*` y `/i/*` (y `/challenges*` cuando se deployee).
- `curl https://pasito.app/.well-known/assetlinks.json` → los dos fingerprints reales intactos.

## Progress Log

- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Fixed, pushed, and deployed the production referral-link 404. Root cause: the deployed Vercel site for `www.pasito.app` did not include the public `/i/[code]` route even though the mobile app generated referral URLs as `https://www.pasito.app/i/<CODE>`. Before the fix, live `https://www.pasito.app/i/DA315F73` returned HTTP 404 with `x-matched-path: /404`, while `https://www.pasito.app/g/test-token` returned HTTP 200 with `x-matched-path: /g/[token]`, proving the domain and Vercel deployment were healthy but the referral route was missing.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Commit `d81f160 Add referral invite route` was created on `main` and pushed to `origin/main`. The commit intentionally includes only the scoped referral fix: `app/i/[code]/page.tsx`, `app/i/[code]/ReferralRedirect.tsx`, `app/i/[code]/referral-link.ts`, `tests/referral-link.test.ts`, and `public/.well-known/apple-app-site-association`. Unrelated dirty waitlist files were left unstaged.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Deployed from a temporary clean worktree at `HEAD` so production did not include unrelated local dirty files. Vercel production deployment: `https://pasito-waitlist-depzkuguy-pasito-aa7e95c2.vercel.app`; alias applied to `https://www.pasito.app`.
- 2026-06-03 15:25 America/Argentina/Buenos_Aires: Verification passed. Local targeted checks: `node --experimental-strip-types --test tests/referral-link.test.ts` passed 2/2, local `.well-known` JSON parse passed, referral route smoke passed, and `git diff --check` passed for the scoped files. Local `npm run build` still hung after the initial Next banner for about 90 seconds and was killed; the remote Vercel build from clean `HEAD` passed compile and TypeScript. Live checks after deploy: `https://www.pasito.app/i/DA315F73` returns HTTP 200 with `x-matched-path: /i/[code]` and renders "Vos y tu amigo ganan 5 Pasitos"; `https://www.pasito.app/g/test-token` still returns HTTP 200 with `x-matched-path: /g/[token]`; live AASA contains both `/g/*` and `/i/*`; live `assetlinks.json` still contains the two real Android SHA256 fingerprints.

- 2026-07-04 11:15 America/Argentina/Buenos_Aires: Added a local, not-yet-deployed Android deferred-referral fix after production investigation showed `/i/[code]` sends non-installed Android users to Play Store without preserving the invite code. `app/i/[code]/referral-link.ts` now builds a Play Store fallback URL with `referrer=pasito_referral_code%3D<CODE>`, `app/i/[code]/page.tsx` passes that URL into `ReferralRedirect`, and `tests/referral-link.test.ts` covers the encoded Play referrer plus the resulting Android intent fallback URL. Verification passed: `node --experimental-strip-types --test tests/referral-link.test.ts` and `git diff --check`. `npx tsc --noEmit --pretty false` still fails on unrelated existing test setup issues outside this referral change (`auth-confirm.test.ts`, `reservation-preview.test.ts`, and `reservation-flow.spec.ts` missing Playwright/types). No Vercel deploy, git stage, commit, push, or production alias change was made.

## Design System (copiado de pasito-dashboard el 2026-07-10)

- Doc: `docs/design-system.md` (copia de `pasito-dashboard/docs/dashboard-design-system.md`).
- Tokens shadcn (`--primary` verde `#0C6B45`, `--foreground` marrón `#442920`, etc.) y bloque `.pasito-dashboard` con tokens `--dashboard-*` en `app/globals.css`.
- Componentes shadcn base-nova en `components/ui/*` (24 componentes sobre `@base-ui/react`), `lib/utils.ts` (`cn`), `hooks/use-mobile.ts`, `components/theme-provider.tsx`, `components.json`.
- Dependencias nuevas: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes`, `sonner`, `recharts`; dev: `shadcn`.
- El `body` global (fondo verde + Poppins) y las páginas de marketing NO cambiaron; los tokens conviven con los estilos previos.

## Repo Cleanup 2026-07-10

- `.gitignore` ahora ignora `supabase/.temp/`, `*.tsbuildinfo` y `pasito-mobile-local*.png`.
- Borrado `app/embajadores/page 2.tsx` (duplicado macOS de `page.tsx`, mismo mtime). OJO: el duplicado tenía montos distintos — "hasta $30.000 + 60 Pasitos" (estándar) y "hasta $40.000 + 90 Pasitos" (3+ sucursales) vs. los $15.000+50 / $20.000+75 que quedaron vivos en `page.tsx`. Si esos montos nuevos eran la versión buena, hay que actualizarlos a mano.
- Borradas capturas locales `pasito-mobile-local-390.png` y `pasito-mobile-local.png`.
- `DOCUMENTACION_REPO.md` movido a `docs/DOCUMENTACION_REPO.md`.

## Current Dirty State After Referral Fix

These files were present as unrelated local changes after the referral deploy and were not included in commit `d81f160`:

- Modified: `app/embajadores/page.tsx`.
- Modified: `app/privacidad/page.tsx`.
- Modified: `app/terminos/page.tsx`.
- Untracked: `app/.well-known/`.
- Untracked: `app/uruguay/UruguayWaitlistForm.tsx`.
- Untracked assets: `public/app-demo-compressed.mp4`, `public/favicon.svg`, `public/icons.svg`, `public/pasito.png`.
- Untracked tests: `tests/auth-confirm.test.ts`, `tests/reservation-flow.spec.ts`, `tests/reservation-preview.test.ts`.

## Operational Caveats

- `npm run build` can hang locally in this repo even when Vercel's remote build succeeds. For production deploys, prefer deploying from a clean worktree or clean clone at the intended commit and verify the remote Vercel build output.
- Do not deploy from the main local working tree when it has unrelated dirty files. Use a clean temporary worktree from `HEAD` to avoid shipping local assets/pages accidentally.
- For referral fixes, always verify both the page route and association files:
  - `curl -I https://www.pasito.app/i/<CODE>` should show HTTP 200 and `x-matched-path: /i/[code]`.
  - `curl https://www.pasito.app/.well-known/apple-app-site-association` should include `/i/*`.
  - `curl https://www.pasito.app/.well-known/assetlinks.json` should still include the real Android fingerprints.
