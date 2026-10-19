# Pasito Agenda — Cal.com self-hosted en Railway

Agenda interna del equipo: cada persona conecta su Google Calendar, tiene su página de booking (`agenda.pasito.app/<usuario>`) y hay Teams con eventos *Collective* que cruzan los calendarios de varias personas para encontrar un horario en que estén todos libres.

- **URL:** https://agenda.pasito.app
- **Railway:** proyecto `pasito-agenda` (workspace "Santiago Schamberger's Projects"), environment `production`
  - Servicio `Cal.com Web App`: imagen `calcom/cal.com`, puerto 3000
  - Servicio `Postgres`: Postgres 17 con volumen
- **DNS:** Cloudflare (`pasito.app`)
- **Emails:** SMTP de Resend, remitente `agenda@pasito.app`
- **Calendarios:** Google Calendar API, app OAuth **Internal** del Workspace `pasito.app`

---

## 1. Ya hecho

- [x] Proyecto `pasito-agenda` creado en Railway desde el template oficial de Cal.com (`calcom`)
- [x] Variables configuradas en `Cal.com Web App`:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_WEBAPP_URL` | `https://agenda.pasito.app` |
| `NEXTAUTH_URL` | `https://agenda.pasito.app/api/auth` |
| `NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL` | `https://pasito.app/privacidad` |
| `NEXT_PUBLIC_WEBSITE_TERMS_URL` | `https://pasito.app/terminos` |
| `ORGANIZATIONS_ENABLED` | `false` (Organizations requiere licencia enterprise; Teams es gratis) |
| `CALCOM_TELEMETRY_DISABLED` | `1` |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_COMPANY_NAME` | `Pasito Agenda` / `Pasito` |
| `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS` | `santiago@pasito.app` |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `agenda@pasito.app` / `Pasito Agenda` |
| `EMAIL_SERVER_HOST` / `PORT` / `USER` | `smtp.resend.com` / `465` / `resend` |
| `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY`, `DATABASE_*` | Generados por Railway (no tocar) |

- [x] Custom domain `agenda.pasito.app` agregado al servicio (puerto 3000), DNS en Cloudflare (CNAME en DNS only + TXT), SSL emitido
- [x] Fixes sobre el template:
  - `NEXT_PUBLIC_SINGLE_ORG_SLUG` vacío. El template lo trae en `"false"`, Cal.com lo toma como si estuviera activado y prende "Single-Org-Mode".
  - **Sin healthcheck HTTP.** Cal.com responde 307 en `/` y `/auth/*` (redirige al login o al setup) y Railway exige 200, así que el deploy fallaba. Si se agrega un healthcheck, tiene que ser una ruta que devuelva 200.

---

## 2. Pendiente

### 2.1 DNS en Cloudflare (zona `pasito.app`) — ✅ hecho

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| CNAME | `agenda` | `6ixs9wa9.up.railway.app` | **DNS only (nube gris)** |
| TXT | `_railway-verify.agenda` | `railway-verify=408cf67ed45b12c3de4144c5a61ef65d32e57f99da015d0111abe5fc7aae79a5` | — |

> El CNAME tiene que estar en **DNS only**. Con el proxy naranja, Railway no puede emitir el certificado SSL.
> Para verificar: Railway → `pasito-agenda` → `Cal.com Web App` → Settings → Networking. El dominio tiene que quedar en verde.

### 2.2 Email (Resend)

1. Crear una API key en Resend con permiso **Sending access** para el dominio `pasito.app`.
2. En Railway → `Cal.com Web App` → Variables, agregar `EMAIL_SERVER_PASSWORD` = esa API key.
3. Ojo: el dominio `pasito.app` en Resend figura como **partially_failed**. Revisar en Resend → Domains qué registro falla (SPF, DKIM o MX de return-path) y corregirlo en Cloudflare. Si no, los emails pueden caer en spam o no salir.

### 2.3 Google Calendar (Google Cloud Console)

Hacerlo con una cuenta admin del Workspace `pasito.app`.

1. Ir a https://console.cloud.google.com, crear el proyecto `pasito-agenda`.
2. **APIs & Services → Library:** habilitar **Google Calendar API**.
3. **OAuth consent screen:**
   - User type: **Internal**. Así no hace falta la verificación de Google y solo pueden entrar cuentas `@pasito.app`.
   - App name: `Pasito Agenda`, support email, dominio autorizado `pasito.app`.
   - Scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `userinfo.email`, `userinfo.profile`, `openid` (para el login con Google)
4. **Credentials → Create credentials → OAuth client ID → Web application:**
   - Authorized JavaScript origins: `https://agenda.pasito.app`
   - Authorized redirect URIs:
     - `https://agenda.pasito.app/api/integrations/googlecalendar/callback`
     - `https://agenda.pasito.app/api/auth/callback/google`
5. Descargar el JSON del cliente. Su forma es `{"web":{"client_id":"…","client_secret":"…",…}}`.
6. En Railway → `Cal.com Web App` → Variables:
   - `GOOGLE_API_CREDENTIALS` = el JSON entero, en una sola línea.
   - Opcional, para entrar con Google: `GOOGLE_LOGIN_ENABLED=true`.
7. Redeployar el servicio.
8. Opcional: activar Google Meet. Después del primer login, ir a Settings → Admin → Apps → "Google Meet" y habilitarla para que las reuniones generen link de Meet.

### 2.4 Primer uso

1. Entrar a `https://agenda.pasito.app/auth/setup`. El primer usuario que se registra queda como **admin**: tiene que ser Santiago.
2. En Settings → Admin → Apps, habilitar Google Calendar (si no se activó sola con la variable).
3. Invitar al equipo: Settings → Teams → crear el team **"Pasito"** → invitar por email.
4. Cada persona:
   1. Entra con su cuenta.
   2. Elige su username, que pasa a ser su página: `agenda.pasito.app/<username>`.
   3. Conecta Google Calendar en Apps → Installed → Calendar.
   4. Configura su disponibilidad (horario laboral y zona horaria `America/Argentina/Buenos_Aires`).
5. Reuniones grupales: en el team, crear un **Event Type**.
   - **Collective:** se ofrecen solo los horarios en que todos los asignados están libres. Crear uno por combinación habitual (por ejemplo "Demo con Santi + Juan"). Queda en `agenda.pasito.app/team/pasito/<evento>`.
   - **Round Robin:** asigna la reunión a quien esté libre, rotando entre los miembros. Sirve, por ejemplo, para demos comerciales.
   - Con **"Hosts can be selected by attendee"** (si la versión lo trae) el que reserva elige con quién quiere la reunión.

---

## 3. Operación

- **Versión:** hoy la imagen es `calcom/cal.com:latest`. Conviene pinearla a un tag fijo (por ejemplo `calcom/cal.com:v5.x.y`, en Railway → Settings → Source → Image) para que un redeploy no traiga cambios que rompan. Para actualizar: cambiar el tag, redeployar, mirar logs (las migraciones de Prisma corren solas al arrancar).
- **Backups:** activar backups del volumen de Postgres en Railway (Postgres → Backups).
- **Recursos:** Cal.com usa ~1 GB de RAM (`MAX_OLD_SPACE_SIZE=4096`). Costo estimado: US$10–20 por mes.
- **Logs:** Railway → `Cal.com Web App` → Deployments → View logs.
- **Licencia:** Cal.com es AGPLv3. Para uso interno sin modificar el código no hay obligaciones extra.
