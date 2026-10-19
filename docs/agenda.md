# Pasito Agenda — DayOtter self-hosted en Railway

Agenda interna del equipo. Cada persona conecta su Google Calendar y tiene su página de booking. Los teams tienen eventos **collective**, que cruzan los calendarios de varias personas y ofrecen solo los horarios en que están todos libres, y **round-robin**, que rota la reunión entre quien esté libre.

- **URL:** https://agenda.pasito.app
- **Software:** [DayOtter](https://github.com/Dayotter/dayotter) v0.5.0 (commit `b26b461`), AGPLv3
- **Railway:** proyecto `pasito-agenda`, environment `production`

| Servicio | Qué es |
|---|---|
| `dayotter-web` | App Next.js (`apps/web/Dockerfile`), puerto 3000, healthcheck `/api/health` |
| `dayotter-worker` | Jobs en background (`apps/worker/Dockerfile`). Su pre-deploy corre las migraciones (`pnpm --filter @dayotter/db migrate`) |
| `Postgres-0Dbb` | Base de datos de DayOtter |
| `Redis` | Colas y cache |

- **DNS (Cloudflare):** CNAME `agenda` → `zsb0s74t.up.railway.app` (**DNS only**) + TXT `_railway-verify.agenda`

## Por qué DayOtter y no Cal.com

Probamos Cal.com self-hosted primero. La gestión de miembros de un team es una "commercial feature" que pide licencia (desde US$15 por usuario por mes), y su fork libre Cal.diy directamente no tiene teams. En DayOtter self-hosted todo lo "Pro" queda gratis: `apps/web/lib/billing/edition.ts` dice que self-hosted desbloquea todo. Los teams, collective y round-robin son parte del núcleo. Solo SSO, white-label y la IA "managed" son exclusivos de su cloud.

## Variables

Las variables compartidas del environment son `DAYOTTER_URL`, `DAYOTTER_AUTH_SECRET` y `DAYOTTER_ENCRYPTION_KEY`. Los dos servicios las referencian como `APP_URL`, `AUTH_SECRET` y `ENCRYPTION_KEY`. `ENCRYPTION_KEY` cifra los tokens OAuth guardados: **no cambiarla una vez que alguien conectó su calendario**, porque se pierden las conexiones.

`DATABASE_URL` = `${{Postgres-0Dbb.DATABASE_URL}}` y `REDIS_URL` = `${{Redis.REDIS_URL}}`. `EMAIL_FROM` = `Pasito Agenda <agenda@pasito.app>`.

> `NEXT_PUBLIC_*` se fijan en el build: si se cambian, hay que redeployar `dayotter-web` (no alcanza con reiniciar).

## Pendiente

### 1. Google Calendar + login con Google

En Google Cloud Console, con una cuenta admin del Workspace `pasito.app`:

1. Crear el proyecto `pasito-agenda` y habilitar la **Google Calendar API**.
2. OAuth consent screen:
   - Tipo **Internal**. Así no hace falta verificación y solo entran cuentas `@pasito.app`.
   - Scopes: `calendar.events`, `calendar.readonly`, `openid`, `email`, `profile`.
3. Crear credenciales: OAuth client ID → Web application.
   - Authorized JavaScript origin: `https://agenda.pasito.app`
   - Authorized redirect URIs:
     - `https://agenda.pasito.app/api/calendars/connect/google/callback` (conectar el calendario)
     - `https://agenda.pasito.app/api/auth/callback/google` (login con Google)
4. En Railway, en **los dos** servicios (`dayotter-web` y `dayotter-worker`), cargar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. En `dayotter-web` agregar además `NEXT_PUBLIC_GOOGLE_AUTH=1` y redeployar.

### 2. Email

Cargar `RESEND_API_KEY` en `dayotter-web` y `dayotter-worker`. Usar una key de Resend con Sending access y el dominio `pasito.app` verificado. Hoy ese dominio figura como *partially_failed* en Resend: hay que revisarlo.

### 3. Equipo

1. Cada persona se registra en https://agenda.pasito.app (cuando esté el paso 1, con Google), conecta su calendario y define su disponibilidad.
2. Crear el team "Pasito", invitar a todos y crear eventos **collective** para las reuniones grupales.

## Riesgos / notas

- **Registro abierto:** DayOtter no tiene una opción para restringir el signup a un dominio. Cualquiera puede crearse una cuenta, aunque solo ve lo suyo.
- **Proyecto chico:** DayOtter tiene pocos contribuidores y es reciente. Por eso la versión quedó fijada a un commit. Para actualizar:
  1. Elegir un tag nuevo.
  2. Re-conectar el source de los dos servicios a ese commit.
  3. Deployar primero el worker, que corre las migraciones.
- **Backups:** activar backups del volumen de `Postgres-0Dbb`.
