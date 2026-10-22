# Eventos Pasito (eventos.pasito.app)

Sistema interno para planificar y operar eventos e iniciativas. Vive en este repo bajo `/gestion` y se sirve en `eventos.pasito.app` con un rewrite por host en `next.config.mjs`.

## Piezas

- **Datos:** Supabase `Pasito - main`, tablas `gestion_*` (RLS activo, solo service role). Migraciones `supabase/migrations/20261022160000_gestion_eventos.sql` y `20261022161000_gestion_eventos_functions.sql`.
  - `gestion_events`: un evento.
  - `gestion_rows`: todas las secciones (presupuesto, sponsors, proveedores, tareas, equipo, aprendizajes, checklist, objetivos, contactos, permisos) con `kind` + `data` jsonb. Las columnas de cada sección se definen en `lib/gestion/schema.ts`.
  - `gestion_activity`: historial (quién, qué, antes → después).
  - `gestion_attendees`, `gestion_checkins`, `gestion_door_pins`: lista, ingresos y PIN de puerta.
- **Cálculos** (resumen, alertas, cierre, plantillas, duplicado): `lib/gestion/summary.ts`, testeados en `tests/gestion-summary.test.ts`.
- **Login:** link mágico por mail a cualquier `@pasito.app` (Resend). Externos los invita un admin desde Equipo. Cookie firmada con `GESTION_SESSION_SECRET` (si falta, se deriva de `EVENT_TICKET_SIGNING_SECRET`).
- **Roles:** `admin` (todo + exportar datos personales + permisos), `equipo` (edita), `lectura`. La puerta usa PIN por evento.
- **App Pasito:** la función `gestion_pasito_event_attendees` lee participantes y entradas canjeadas (con su código) de `partner_events` directo de la misma base. No hace falta webhook ni polling.
- **Entradas web (Rebill / dLocal):** en la Ficha se vinculan tandas de `event_ticket_tiers` (`web_tiers`, formato `slug:posición`). `gestion_web_tickets` lee las entradas aprobadas; ventas e ingresos entran solos al resumen y presupuesto, y la lista se sincroniza sola (`lib/gestion/sources.ts`) al abrir Asistentes, la puerta o el reporte. Los reembolsos salen de la lista y los ingresos hechos con el escáner viejo se reflejan. Al hacer check-in acá, `gestion_apply_checkin` también marca el `event_tickets` original como usado.
- **Puerta** (`/gestion/puerta/<id>`): descarga la lista, escanea QR o código de la app, busca por nombre/DNI, guarda ingresos sin señal y sincroniza cada 5 s. Los ingresos llevan un id generado en el celular; `gestion_apply_checkin` es idempotente y marca duplicados.
- **Logos y portadas:** bucket público `gestion-public` (subida en `/api/gestion/upload`) o rutas del propio sitio (`/pasito-club/sponsors/x.webp`). Los logos blancos se detectan y se muestran sobre fondo oscuro.
- **Resumen diario y retención:** Vercel Cron (`vercel.json`) llama a `/api/gestion/cron/daily` los días hábiles a las 8 AM (protegido con `CRON_SECRET`): manda a cada persona sus tareas, alertas críticas y eventos de la semana, y anonimiza las listas de asistentes 180 días después del evento.
- **Pantallas:** Inicio, Eventos, Calendario, Tareas (de todo el equipo), Equipo, ficha de evento con 10 pestañas y reporte imprimible para sponsors (`/gestion/eventos/<id>/reporte`).

## Puesta en marcha

1. DNS en Cloudflare: `CNAME eventos → cname.vercel-dns.com` (solo DNS, nube gris).
2. Vercel, proyecto `pasito-waitlist` → Domains → agregar `eventos.pasito.app`.
3. (Opcional) `GESTION_SESSION_SECRET` en Vercel con 32+ caracteres aleatorios.
