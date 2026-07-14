# Documentacion completa del repo Pasito Waitlist

Ultima revision del codigo: 2026-07-09.

Este documento describe lo que hace este repositorio, las reglas visibles en el codigo, las integraciones externas, las rutas publicas y el motivo tecnico/funcional detras de cada parte. La fuente de verdad para esta documentacion es el estado actual del repo en `/Users/santiago/dev/pasito-waitlist`.

## 1. Que es este repo

Este repo es una aplicacion web publica de Pasito construida con Next.js App Router. No es la app mobile principal ni contiene toda la logica de negocio de Pasito. Funciona como sitio publico, capa de deep links, paginas legales, formularios, tienda, landing de embajadores, vista publica de desafios y puente web para acciones que terminan en Supabase o en la app mobile.

El proyecto cumple varios roles:

- Presentar Pasito y derivar a App Store / Google Play.
- Capturar emails de waitlist.
- Capturar mensajes de contacto.
- Capturar postulaciones al programa de Embajadores Pasito.
- Vender remeras Pasito con checkout Rebill y stock en Supabase.
- Resolver links universales y app links para invitaciones de grupos, referidos y desafios.
- Mostrar paginas de confirmacion de reservas para comercios.
- Mostrar desafios publicos y ganadores.
- Servir terminos, privacidad, eliminacion de cuenta y guias de soporte.
- Servir archivos `.well-known` para iOS Universal Links y Android App Links.

## 2. Stack tecnico

Framework:

- Next.js `16.2.4`.
- React `19.2.3`.
- TypeScript `5.9.3`.
- App Router en carpeta `app/`.

Estilos:

- Tailwind CSS `4.1.17`.
- CSS global en `app/globals.css`.
- Fuentes locales en `public/fonts/`.
- Tipografias principales: `Paytone One` para display y `Poppins` para texto.

Integraciones:

- Supabase JS `@supabase/supabase-js`.
- Resend para emails.
- Rebill para checkout de tienda via web component cargado desde CDN.
- Lucide React para iconos.

Scripts disponibles:

```bash
npm run dev
npm run build
npm run start
```

Los scripts fuerzan webpack con `next dev --webpack` y `next build --webpack`.

## 3. Variables de entorno

Variables usadas por el repo:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica de Supabase. Se usa en server y en llamadas a Edge Functions.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key para llamar Edge Functions publicas de reserva.
- `SUPABASE_SERVICE_ROLE_KEY`: service role para operaciones server-side privilegiadas: waitlist, embajadores, tienda y desafios.
- `RESEND_API_KEY`: habilita envio de emails.
- `RESEND_AUDIENCE_ID_WAITLIST`: opcional; agrega contactos de waitlist a una audiencia de Resend.
- `NEXT_PUBLIC_APP_STORE_URL`: override para el link de App Store.
- `NEXT_PUBLIC_PLAY_STORE_URL`: override para Google Play.
- `NEXT_PUBLIC_APP_STORE_ID`: habilita meta `apple-itunes-app` para Smart App Banner.
- `NEXT_PUBLIC_REBILL_PUBLIC_KEY`: override de public key de Rebill en la tienda.
- `REBILL_SECRET_KEY`: clave server-side para verificar pagos en Rebill.
- `TEST_BASE_URL`, `TEST_VALID_TOKEN`, `TEST_EXPIRED_TOKEN`, `TEST_REJECT_TOKEN`: variables usadas por tests E2E de reservas.

Hay fallbacks hardcodeados para algunos valores de Supabase y stores. Eso permite que ciertas paginas rendericen, pero las operaciones reales dependen de claves validas.

## 4. Configuracion Next.js

Archivo: `next.config.mjs`.

Reglas principales:

- Redirige `pasito.app/*` a `https://www.pasito.app/*`, excepto rutas `.well-known`.
- La excepcion `.well-known` existe porque Apple y Google necesitan recibir esos archivos con HTTP 200 directo. Si el apex redirige esos archivos, Universal Links y Android App Links pueden no verificarse.
- Agrega header `Content-Type: application/json` a `/.well-known/apple-app-site-association`, porque el archivo no tiene extension.
- Configura `turbopack.root` como `process.cwd()`.
- Configura `webpack.watchOptions.ignored` para evitar watchers sobre `.git`, `.next`, `node_modules`, `.playwright-mcp` y capturas Android locales.

## 5. Estructura principal

Carpetas importantes:

- `app/`: rutas, paginas, API routes y componentes de la aplicacion Next.
- `public/`: assets estaticos, videos, imagenes, fuentes, PDFs y archivos `.well-known`.
- `content/`: textos legales cargados como archivos `.txt`.
- `supabase/migrations/`: migraciones SQL propias de este repo.
- `tests/`: tests unitarios con `node:test` y un spec Playwright para reservas.
- `MEMORY.md`: memoria operacional del proyecto, deploys y caveats.
- `CONTACT_SETUP.md`: guia de configuracion del formulario de contacto.

## 6. Rutas publicas

### `/`

Archivo: `app/page.tsx`.

Landing principal de Pasito. Muestra:

- Video de fondo `public/bg-video.mp4`.
- Logo `public/logoverde.png`.
- Claim: "El movimiento que genera movimiento."
- Copy de producto.
- Botones a App Store y Google Play.
- Links a privacidad, terminos y terminos del desafio CLV.

Por que existe:

- Es la puerta publica mas simple de Pasito.
- Convierte visitantes en descargas de app.
- Mantiene legales accesibles desde el primer viewport.

### `/uruguay`

Archivos:

- `app/uruguay/page.tsx`
- `app/uruguay/WaitlistForm.tsx`
- `app/uruguay/UruguayWaitlistForm.tsx`

Landing de waitlist para Uruguay. Muestra:

- Mensaje de proximamente en Uruguay.
- Formulario de email.
- Contador social de personas anotadas.
- Links a contacto, privacidad, terminos y eliminar cuenta.

Reglas:

- `revalidate = 0`: no cachea la pagina porque el contador debe estar fresco.
- El contador parte de `URUGUAY_WAITLIST_BASE = 600`.
- Cuenta registros de la tabla `waitlist` creados desde `2026-05-24T21:42:44Z`.
- Si faltan env vars o Supabase falla, muestra solo la base 600.
- El formulario publica a `/api/waitlist`.

Nota de estado:

- `WaitlistForm` es el componente usado por la pagina.
- `UruguayWaitlistForm` existe, pero no esta conectado actualmente en `app/uruguay/page.tsx`.

### `/contacto`

Archivos:

- `app/contacto/page.tsx`
- `app/api/contact/route.ts`

Pagina con formulario de contacto. Campos:

- Nombre.
- Email.
- Mensaje.

Reglas:

- Todos los campos son obligatorios.
- Email debe cumplir regex basica.
- Si `RESEND_API_KEY` existe, envia mail a `contacto@pasito.app`.
- Si no existe `RESEND_API_KEY`, loguea en consola y devuelve `ok: true` para desarrollo.
- El mail se envia desde `Pasito Contacto <contacto@pasito.app>` con `reply_to` del usuario.

Por que existe:

- Da un canal publico de soporte/contacto.
- Permite desarrollo local sin bloquear por falta de Resend.

### `/embajadores`

Archivos:

- `app/embajadores/page.tsx`
- `app/embajadores/AmbassadorLeadForm.tsx`
- `app/api/ambassadors/route.ts`
- `supabase/migrations/20260525162804_create_embajadores_table.sql`
- `supabase/migrations/20260525180945_add_pasito_reason_to_embajadores.sql`

Landing del programa Embajadores Pasito. Explica:

- Que un embajador invita comercios a Pasito.
- Que el comercio debe usar un link/codigo personal.
- Que Pasito valida y activa el comercio.
- Que la recompensa llega cuando hay comercios reales generando canjes.

Reglas de negocio expresadas en la pagina:

- Un local estandar puede generar hasta `$15.000 + 50 Pasitos`.
- Un local con 3 o mas sucursales puede generar hasta `$20.000 + 75 Pasitos`.
- El premio fuerte se libera cuando el comercio llega a 10 canjes reales.
- Hay hitos: activacion, 10 canjes reales y permanencia 30 dias despues.
- No se paga solo por pasar contactos.
- Si dos embajadores invitan el mismo comercio, en general cuenta el link usado en el registro.
- Pasito puede revisar duplicados manualmente.
- Los comercios buscados son negocios con atencion al publico y un premio gratis real.

Formulario:

- Nombre y apellido.
- Instagram.
- Zona donde quiere representar a Pasito.
- Email.
- WhatsApp.
- Motivo: por que le gusta Pasito.

Validaciones API:

- Body debe ser JSON object.
- Todos los campos son obligatorios.
- Email con regex basica.
- WhatsApp debe tener al menos 8 digitos.
- `pasitoReason` maximo 600 caracteres.
- Requiere Supabase URL y service role.

Persistencia:

- Inserta en tabla `embajadores`.
- Guarda `full_name`, `instagram`, `location`, `email`, `whatsapp`, `pasito_reason`, `user_agent`.
- Tabla con RLS habilitado.
- Indices por `created_at desc` y `email`.
- Campo `status` default `new`.
- Campo `source` default `embajadores_landing`.

Emails:

- Si `RESEND_API_KEY` existe, envia un mail a `contacto@pasito.app`.
- Si Resend falla, solo loguea el error y responde `ok: true`, porque el lead ya fue guardado.
- El HTML del mail escapa contenido de usuario con `escapeHtml`.

### `/tienda`

Archivos:

- `app/tienda/page.tsx`
- `app/tienda/StoreClient.tsx`
- `app/api/orders/route.ts`
- `app/api/orders/intent/route.ts`
- `lib/store-shipping.ts`
- `supabase/migrations/20260702000000_tienda_store.sql`
- `supabase/migrations/20260713131306_tienda_shipping_addresses.sql`

Tienda de remera oficial Pasito.

Producto:

- Nombre: `Remera Pasito`.
- Precio unitario: `35000`.
- Moneda: `ARS`.
- Envio a domicilio: `5000`.
- Retiro en Belgrano o Palermo: gratis. El punto exacto y horario se informan de forma privada despues de la compra.
- Los envios se despachan dentro de 5-6 dias habiles.
- Maximo por orden: `10`.
- Edicion limitada comunicada como una sola tanda, sin reposicion.

Variantes:

- Remera blanca con estampa verde.
- Remera negra con estampa blanca.
- Talles: `S`, `M`, `L`, `XL`.

Stock:

- La pagina lee `tienda_stock` con service role.
- `revalidate = 0` para stock fresco.
- Si Supabase no esta configurado o falla, el cliente informa que no puede confirmar el stock y bloquea la compra para no mostrar disponibilidad ficticia.
- Stock inicial por migracion: blanca S 24, M 23, L 23, XL 23; negra S 24, M 23, L 23, XL 23.

Checkout:

- Usa web component `rebill-checkout`.
- Carga SDK desde `https://unpkg.com/rebill@1.17.28/dist/rebill/rebill.esm.js`.
- Usa `NEXT_PUBLIC_REBILL_PUBLIC_KEY`.
- El `instantProduct` incluye nombre, descripcion, amount, currency y metadata: base, print, size, qty, delivery y, para envios, `checkoutIntentId`.
- El resumen interno de Rebill se oculta y el repo muestra su propio resumen.

Direccion de envio:

- Se pide antes de abrir Rebill: calle y numero, piso/departamento opcional, localidad, provincia, codigo postal, telefono e indicaciones opcionales.
- `POST /api/orders/intent` valida variante, stock y direccion, y crea un intent de dos horas en `tienda_checkout_intents`.
- Rebill recibe solo el UUID `checkoutIntentId`; la direccion no se copia al proveedor de pagos.
- Los intents vencidos se eliminan de forma oportunista al preparar nuevos checkouts.
- Al confirmar el pago, la RPC v2 bloquea y consume el intent, y copia la direccion a `tienda_orders` dentro de la misma transaccion que descuenta stock.

Confirmacion de orden:

- Al evento `success` de Rebill, el cliente llama `POST /api/orders` con `paymentId`, variante, talle, cantidad y entrega.
- El servidor verifica el pago contra Rebill (`https://api.rebill.com/v3/payments/:paymentId`) usando `REBILL_SECRET_KEY`.
- Solo acepta pagos `approved`.
- Verifica monto exacto esperado: `PRICE * qty + shipping`.
- Verifica moneda `ARS`.
- Luego llama RPC Supabase `tienda_confirm_order_v2`.

Reglas atomicas de Supabase:

- `tienda_stock` y `tienda_orders` tienen RLS habilitado sin politicas, para acceso solo via service role / server.
- `tienda_orders.rebill_payment_id` es unique para idempotencia.
- RPC `tienda_confirm_order_v2`:
  - Si el pago ya fue procesado, devuelve `duplicate`.
  - Para envios exige un `checkoutIntentId` vigente, no consumido y consistente con la variante pagada.
  - Bloquea la fila de stock con `for update`.
  - Si no hay stock suficiente, devuelve `insufficient_stock`.
  - Descuenta stock, inserta la orden con direccion y consume el intent atomicamente.
  - Devuelve `confirmed`.
  - En carrera por unique violation, devuelve `duplicate`.
- La RPC anterior queda disponible durante el rollout, pero `PUBLIC`, `anon` y `authenticated` no tienen permiso de ejecucion. Ambas RPC quedan reservadas a `service_role`.

Emails:

- Si la orden es `confirmed`, hay email de cliente y `RESEND_API_KEY` existe, envia confirmacion de compra.
- Si la orden es duplicada, no reenvia mail.
- Retiro en Belgrano o Palermo informa que el punto exacto y horario se coordinan por email despues de la compra.
- Envio repite la direccion guardada e informa despacho dentro de 5-6 dias habiles.

Por que esta disenado asi:

- El cliente solo inicia checkout; no es fuente de verdad.
- Rebill es fuente de verdad del pago.
- Supabase RPC evita sobreventa e idempotencia rota por doble callback.
- RLS cerrado reduce exposicion de stock/ordenes.

### `/g/[token]`

Archivos:

- `app/g/[token]/page.tsx`
- `app/g/[token]/InviteRedirect.tsx`

Link publico de invitacion a grupo de amigos.

Comportamiento:

- Genera metadata con URL `https://www.pasito.app/g/<token>`.
- Si `NEXT_PUBLIC_APP_STORE_ID` existe, agrega Smart App Banner con `app-argument`.
- Detecta plataforma en cliente: iOS, Android o desktop.

Android:

- Construye `intent://www.pasito.app/g/<token>#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=...;end`.
- Si la app esta instalada y App Links estan verificados, abre la app.
- Si no, Chrome usa fallback a Play Store.

iOS:

- Usa custom scheme `ar.pasito.pasito://g/<token>`.
- Espera `1800ms`.
- Si la pagina sigue visible, redirige al App Store.
- Si la app toma foco, cancela el fallback por `visibilitychange`.

Desktop:

- No intenta abrir app.
- Muestra instrucciones, links a stores y boton para copiar link.

### `/i/[code]`

Archivos:

- `app/i/[code]/page.tsx`
- `app/i/[code]/ReferralRedirect.tsx`
- `app/i/[code]/referral-link.ts`

Link publico de referidos.

Reglas:

- El codigo se normaliza con `normalizeReferralCode`:
  - Elimina todo lo que no sea alfanumerico.
  - Convierte a uppercase.
- URL canonica: `https://www.pasito.app/i/<CODE>`.
- Copy visible: "Vos y tu amigo ganan 5 Pasitos".
- El bonus se acredita cuando el invitado suma su primer Pasito caminando.

Android:

- Construye Play Store fallback con `referrer=pasito_referral_code=<CODE>`.
- El fallback queda encodeado dentro del Android intent.
- Esto preserva el codigo si el usuario no tiene la app instalada y llega desde Play Store.

iOS:

- Usa custom scheme `ar.pasito.pasito://i/<CODE>`.
- Fallback al App Store despues de 1800 ms si la app no abre.

Desktop:

- Muestra el link completo, botones a stores y boton copiar.

Por que existe:

- Resuelve referidos de la app mobile en web.
- Evita perder atribucion en Android deferred install.

### `/r/[token]`

Archivos:

- `app/r/[token]/page.tsx`
- `app/r/[token]/reservation-preview.ts`
- `app/r/[token]/confirm/route.ts`
- `app/r/[token]/reject/route.ts`
- `app/r/[token]/done/page.tsx`

Flujo de confirmacion/rechazo de reservas por comercios.

Arquitectura:

- Next no implementa la regla final de reserva.
- Next actua como UI y puente hacia Supabase Edge Functions:
  - `coupon-preview`
  - `confirm-reservation`
  - `reject-reservation`

Preview:

- `POST` a `${SUPABASE_URL}/functions/v1/coupon-preview`.
- Envia `{ token }`.
- Usa `Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}`.
- `cache: no-store`.
- Normaliza contrato con `normalizePreviewResponse`.

Campos esperados:

- `coupon_id`
- `status`
- `client_first_name`
- `reward_title`
- `partner_name`
- `expires_at`
- `pasitos_spent`

Estados aceptados:

- `pending_confirmation`
- `confirmed`
- `used` se mapea a `confirmed`
- `rejected`
- `cancelled`
- `expired`

Si el payload falta o esta mal formado:

- Devuelve `null`.
- La pagina muestra "Link invalido".

Si esta pendiente:

- Muestra servicio, cliente, costo en Pasitos y vencimiento.
- Permite confirmar o rechazar con formularios POST.

Confirmar:

- `POST /r/[token]/confirm`.
- Llama Edge Function `confirm-reservation`.
- Si responde ok, redirige 303 a `/r/[token]/done?status=confirmed`.
- Si falla, redirige a `status=error`.

Rechazar:

- `POST /r/[token]/reject`.
- Llama Edge Function `reject-reservation`.
- Si responde ok, redirige 303 a `/r/[token]/done?status=rejected`.
- Si falla, redirige a `status=error`.

Mensajes:

- Confirmada: el cliente fue notificado y los pasitos se descontaron.
- Rechazada: los pasitos fueron devueltos.
- Error: puede estar ya procesada o vencida.

Por que existe:

- Permite a comercios actuar desde un link web sin entrar a un panel.
- Mantiene la mutacion real en Supabase Edge Functions.

### `/challenges`

Archivos:

- `app/challenges/page.tsx`
- `app/challenges/challenges-data.ts`
- `app/challenges/[id]/page.tsx`

Paginas publicas de desafios y ganadores.

Arquitectura:

- Son server components dinamicos (`dynamic = 'force-dynamic'`).
- Usan Supabase service role desde servidor.
- No exponen la service role al browser.

Lista:

- Lee hasta 12 desafios activos (`is_active = true`).
- Ordena primero por no cerrados/cerrados y luego por `end_date desc`.
- Muestra si estan activos o terminados.

Detalle:

- Valida que el `id` sea UUID.
- Lee desafio activo por id.
- Lee participantes ganadores.
- Lee perfiles de usuarios ganadores.
- Lee entradas de sorteo seleccionadas.

Reglas de ganadores:

- Si `winner_selection_mode` es `raffle_top_n`, la posicion para premio fisico sale de `draw_order`.
- Si no, la posicion sale de `final_rank`.
- Los premios fisicos se asignan segun `brand_prizes` y `winner_count`.
- Ganadores fisicos y ganadores de Pasitos se muestran en grupos separados.
- Si el perfil tiene `hide_from_leaderboard = true` o no tiene nombre, muestra `Pasitero`.
- Si el perfil esta oculto, no muestra barrio.

Por que existe:

- Permite compartir resultados de desafios fuera de la app.
- Respeta privacidad basica del leaderboard.

### `/auth-confirm`

Archivos:

- `app/auth-confirm/page.tsx`
- `app/auth-confirm/auth-confirm.ts`
- `app/auth-confirm/continue/route.ts`

Pantalla intermedia para confirmar accesos magic link / signup.

Problema que resuelve:

- Algunos filtros de email o previews abren links automaticamente.
- Esta pagina evita consumir el link antes que el usuario toque un boton.

Reglas:

- Extrae `token`, `token_hash`, `type`, `redirect_to` o una `confirmation_url`.
- Acepta tipos `magiclink`, `email` y `signup`.
- Normaliza `email` a `magiclink`.
- Rechaza redirect targets que no empiecen con `ar.pasito.pasito://login-callback`.
- Si parametros validos, muestra un form POST con boton "Abrir Pasito".
- El POST redirige con 303 a `/auth/v1/verify` de Supabase con `token`, `type` y `redirect_to`.
- Si los parametros son invalidos, redirige a error.

Por que existe:

- Aumenta seguridad y confiabilidad del login por email.
- Evita que links validos se consuman por clientes de correo.

### `/confirmado`

Pagina simple de confirmacion de waitlist.

Regla importante:

- El email de waitlist tiene un boton a `https://pasito.app/confirmado`.
- La pagina no muta estado; solo muestra confirmacion.

### `/privacidad`

Pagina de politica de privacidad. Contenido hardcodeado en `app/privacidad/page.tsx`.

Incluye:

- Responsable: Santiago Schamberger.
- Ley argentina 25.326 y menciones GDPR cuando corresponda.
- Datos de registro/perfil.
- Datos de pasos desde HealthKit, Health Connect o sensor Android.
- Ubicacion solo al usar mapa.
- Datos de canje.
- Datos tecnicos, push, Firebase, diagnostico.
- Datos que no recopila.
- Finalidades.
- Proveedores.
- Retencion.
- Derechos ARCO.

### `/terminos`

Lee `content/terminos-y-condiciones.txt` y lo muestra en un `<pre>` con wrapping.

### `/terminos/clv`

Lee `content/terminos-clv.txt` y lo muestra. Corresponde al desafio "Cuan Lejos Voy".

### `/terminos/decathlon`

Redirige a `/terminos/clv`. Es compatibilidad con una ruta legacy.

### `/eliminar-cuenta`

Pagina publica de instrucciones para eliminar cuenta.

Reglas comunicadas:

- Opcion 1: desde la app, Perfil -> Ajustes -> Eliminar cuenta.
- Opcion 2: por email a `contacto@pasito.app`.
- Para solicitud por email, procesar en plazo maximo de 48 horas segun texto de la pagina.
- Comunica que se eliminan datos personales, pasos, historial, Pasitos y cupones activos.
- Comunica que la accion es irreversible.

### `/conectar-android`

Archivos:

- `app/conectar-android/page.tsx`
- `app/conectar-android/ConnectAndroidGuide.tsx`

Guia interactiva de soporte Android para problemas de pasos.

Flujos:

- "Se desconecto": resetear permisos, probar, revisar bateria de Pasito y app fuente.
- "Nunca conto": revisar Health Connect, resetear permisos, probar, revisar bateria.
- "Sigue sin contar": revisar bateria de Pasito y app fuente, probar.

Reglas comunicadas:

- Pasito lee pasos desde Health Connect.
- Si Health Connect no tiene datos, Pasito no puede leer nada.
- Hay que revisar permisos de Pasito y de la app fuente de pasos.
- En algunos Android hay que marcar Pasito y la app fuente como "No restringido" en bateria.

## 7. API Routes

### `POST /api/waitlist`

Archivo: `app/api/waitlist/route.ts`.

Entrada:

```json
{ "email": "persona@example.com" }
```

Reglas:

- Body debe ser JSON.
- Email se trimea y pasa a lowercase.
- Email debe pasar regex basica.
- Inserta en tabla `waitlist`.
- Si Supabase devuelve unique violation `23505`, responde `{ ok: true, already: true }`.
- Si hay otro error de Supabase, responde 500.
- Si `RESEND_API_KEY` existe:
  - Envia email de confirmacion al usuario.
  - Si `RESEND_AUDIENCE_ID_WAITLIST` existe, crea contacto en audiencia Waitlist.
- Revalida `/` y `/uruguay`.

Observaciones:

- El handler asume que `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` existen cuando se llama `getSupabase`.
- El email de confirmacion apunta a `/confirmado`; no confirma en base.

### `POST /api/contact`

Ya descrito en `/contacto`.

### `POST /api/ambassadors`

Ya descrito en `/embajadores`.

### `POST /api/orders`

Ya descrito en `/tienda`.

## 8. Supabase y base de datos

Este repo contiene migraciones solo para partes web propias:

### `embajadores`

Tabla:

- `id uuid primary key default gen_random_uuid()`
- `full_name text not null`
- `instagram text not null`
- `location text not null`
- `email text not null`
- `whatsapp text not null`
- `status text not null default 'new'`
- `source text not null default 'embajadores_landing'`
- `user_agent text`
- `created_at timestamptz not null default now()`
- `pasito_reason text not null default ''`

RLS:

- Habilitado.

Indices:

- `created_at desc`.
- `email`.

Constraint:

- `char_length(pasito_reason) <= 600`.

### `tienda_stock`

Tabla:

- `base text not null`
- `size text not null`
- `qty integer not null default 0 check (qty >= 0)`
- Primary key `(base, size)`.

RLS:

- Habilitado sin politicas.

Semilla:

- 93 unidades blancas y 93 negras en la migracion actual.

### `tienda_orders`

Tabla:

- `id uuid primary key default gen_random_uuid()`
- `rebill_payment_id text unique not null`
- `base text not null`
- `print text`
- `size text not null`
- `qty integer not null check (qty > 0)`
- `delivery text not null`
- `amount numeric not null`
- `currency text not null default 'ARS'`
- `email text`
- `customer_name text`
- `checkout_intent_id uuid` (unique parcial cuando no es null)
- `shipping_address_line1 text`
- `shipping_address_line2 text`
- `shipping_city text`
- `shipping_province text`
- `shipping_postal_code text`
- `shipping_country_code text`
- `shipping_phone text`
- `shipping_notes text`
- `status text not null default 'paid'`
- `created_at timestamptz not null default now()`

RLS:

- Habilitado sin politicas.

Indice:

- `created_at desc`.

RPC:

- `public.tienda_confirm_order(...) returns text`.
- `public.tienda_confirm_order_v2(..., p_checkout_intent_id uuid) returns text`.
- Usa `security definer`.
- Solo `service_role` puede ejecutar las RPC de tienda.
- La version v2 devuelve `confirmed`, `duplicate`, `insufficient_stock` o `invalid_checkout_intent`.

### `tienda_checkout_intents`

- Guarda temporalmente direccion, telefono y seleccion del producto antes de abrir Rebill.
- Expira a las dos horas.
- Tiene RLS habilitado y grants solo para `service_role`.
- `consumed_at` y `consumed_by_payment_id` impiden reutilizar una direccion para otro pago.
- La direccion confirmada se copia a `tienda_orders`; los intents vencidos se eliminan.

## 9. Universal Links, App Links y archivos estaticos criticos

### iOS

Archivo: `public/.well-known/apple-app-site-association`.

Configura:

- App ID: `U8G7MYY9X8.ar.pasito.pasito`.
- Componentes:
  - `/g/*`
  - `/i/*`
  - `/challenges`
  - `/challenges/*`

`next.config.mjs` fuerza `Content-Type: application/json` para este archivo.

### Android

Archivo: `public/.well-known/assetlinks.json`.

Configura:

- Package: `ar.pasito.pasito`.
- Relation: `delegate_permission/common.handle_all_urls`.
- Dos SHA256 fingerprints reales.

Regla operacional importante:

- No reemplazar estos archivos por rutas dinamicas ni redirecciones sin preservar fingerprints y HTTP 200 directo.

## 10. Assets

Assets clave:

- `public/bg-video.mp4`: fondo de landing principal.
- `public/app-demo-compressed.mp4`: demo de app, actualmente asset disponible.
- `public/logoverde.png`: logo verde.
- `public/pasitohorizontal.png`: logo horizontal usado en varias paginas.
- `public/icon.png`, `public/favicon.svg`, `public/icons.svg`.
- `public/fondo.png`: patron usado en embajadores.
- `public/paloma-main.png`, `public/paloma-corriendo.png`: assets de marca.
- `public/tienda/*`: fotos de remeras.
- `public/fonts/*`: fuentes locales.
- PDFs legales en `public/Politica_de_Privacidad_Pasito.pdf` y `public/Terminos_y_Condiciones_Pasito.pdf`.

## 11. Tests

### Unitarios con Node test runner

`tests/referral-link.test.ts`:

- Valida normalizacion de codigos de referido.
- Valida URL publica `/i/CODE`.
- Valida Play Store referrer.
- Valida Android intent.
- Valida custom scheme iOS.

`tests/reservation-preview.test.ts`:

- Valida normalizacion del contrato `coupon-preview`.
- Rechaza payloads malformados.
- Mapea status `used` a `confirmed`.

`tests/auth-confirm.test.ts`:

- Valida extraccion de token desde `confirmation_url`.
- Normaliza tipo `email` a `magiclink`.
- Acepta `signup`.
- Rechaza redirects web no permitidos.
- Construye URL Supabase `/auth/v1/verify`.

Comando practico para estos tests:

```bash
node --experimental-strip-types --test tests/referral-link.test.ts tests/reservation-preview.test.ts tests/auth-confirm.test.ts
```

### Playwright E2E

`tests/reservation-flow.spec.ts`:

- Requiere dev server.
- Requiere Supabase Edge Functions desplegadas o locales.
- Requiere tokens de prueba.
- Prueba token invalido, preview pendiente, confirmacion, rechazo y expiracion.

Comando indicado en el archivo:

```bash
npx playwright test tests/reservation-flow.spec.ts
```

## 12. Caveats operacionales conocidos

Segun `MEMORY.md`:

- El repo suele tener cambios locales sin commitear. No desplegar desde el working tree principal si hay cambios no relacionados.
- Para deploys de produccion, conviene usar worktree limpio desde el commit objetivo.
- `npm run build` puede colgar localmente aun cuando Vercel compile correctamente.
- Para fixes de referidos, verificar:
  - `/i/<CODE>` responde 200.
  - AASA contiene `/i/*`.
  - `assetlinks.json` mantiene fingerprints reales.

Estado observado el 2026-07-09:

- Hay archivos modificados y no trackeados en el working tree.
- Esta documentacion describe el estado actual del codigo local, incluyendo archivos no trackeados que aparecen en el arbol.

## 13. Limites de este repo

Este repo no contiene toda la logica de Pasito. En particular, quedan fuera:

- La app iOS/Android.
- La logica completa de pasos, Pasitos, canjes, cupones y desafios dentro de la app.
- Edge Functions de Supabase como `coupon-preview`, `confirm-reservation`, `reject-reservation` y `request-reservation`.
- Esquema completo de Supabase para usuarios, perfiles, challenges, participants, coupons y partners.
- Paneles internos o dashboards prometidos en copy de embajadores.

Cuando el repo muestra o ejecuta algo que depende de esos sistemas, actua como cliente web o puente.

## 14. Por que existe cada decision importante

- Service role solo en servidor: permite leer/escribir datos privados sin exponer claves al cliente.
- RLS habilitado en tablas de tienda y embajadores: reduce superficie de acceso directo.
- RPC atomica de tienda: evita sobreventa y doble descuento de stock.
- Verificacion de pago contra Rebill: evita confiar en eventos del cliente.
- `revalidate = 0` en tienda y Uruguay: stock y contador deben ser frescos.
- `.well-known` sin redirect: necesario para verificacion Apple/Google.
- Pantalla `/auth-confirm`: evita consumo automatico de magic links por bots/previews de email.
- Android intent con fallback: abre app instalada o envia a Play Store.
- Play Store `referrer` en referidos: conserva codigo despues de instalar.
- Fallbacks de stores via env vars: permite cambiar links sin tocar codigo.
- Tests sobre helpers puros: protegen deep links, auth confirm y contrato de reserva, que son flujos faciles de romper.

## 15. Checklist para modificar sin romper

Antes de tocar deep links:

- Revisar `public/.well-known/apple-app-site-association`.
- Revisar `public/.well-known/assetlinks.json`.
- Correr `tests/referral-link.test.ts`.
- Probar rutas `/g/<token>` y `/i/<code>`.

Antes de tocar tienda:

- Mantener sincronizados `PRICE`, `SHIPPING`, `CURRENCY` entre `StoreClient.tsx` y `/api/orders`.
- Verificar `REBILL_SECRET_KEY`.
- Probar monto esperado y moneda.
- No saltar la RPC atomica.

Antes de tocar reservas:

- Confirmar contrato de Edge Functions.
- Correr `tests/reservation-preview.test.ts`.
- Si hay tokens reales de test, correr Playwright.

Antes de tocar auth:

- Correr `tests/auth-confirm.test.ts`.
- No permitir redirects fuera de `ar.pasito.pasito://login-callback`.

Antes de desplegar:

- Revisar `git status`.
- Evitar incluir cambios locales no relacionados.
- Si el build local cuelga, validar con build remoto limpio y smoke tests de rutas criticas.
