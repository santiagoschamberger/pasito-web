# Handoff del catálogo online

Estado al 24 de octubre de 2026. Continuar en `santiagoschamberger/pasito-web`, rama `codex/catalogo-online`, sobre la base de Santi `1f2fad6`. El catálogo se integra en `/beneficios` dentro del sitio existente y utiliza su versión de Next.js, su raíz y su proyecto Vercel. No es una aplicación ni un repositorio nuevo.

## Qué quedó integrado

- `/beneficios`: catálogo público de tiendas online, búsqueda, categorías horizontales, orden y filtro por saldo.
- `/beneficios/[id]`: beneficio y confirmación de canje por Pasitos.
- `/beneficios/comercios/[id]`: comercio, beneficios y enlace a su tienda.
- `/beneficios/ingresar` y `/beneficios/auth/callback`: OTP y OAuth Google/Apple, con sesión SSR.
- `/beneficios/canjes` y `/beneficios/canjes/[id]`: historial y cupón copiable; éxito con ilustración de la app.
- `/beneficios/pasitos`: contador clickeable, saldo, ganado hoy, vencimientos y movimientos agrupados por fecha. Incluye caminatas, canjes, compartir, referidos y boosts. Permite ampliar de 30 en 30 días hasta 360; canjes y bonos mantienen el límite de 50 registros de la app.

Se trasladaron assets, componentes, lógica, pruebas, migración y entorno de prueba. No se copió la historia Git ni la baseline privada de la app Flutter al repositorio público.

## Lo que se conserva de Santi

Los metadatos y canonical de `/beneficios`, noindex hasta el lanzamiento, su página original de preparación y sus estilos. Sin la clave pública configurada, la página de preparación sigue disponible. Los componentes marketing, layout global, redirects, rewrites, `.well-known`, deep links, pagos y `vercel.json` no se modificaron. El proxy de autenticación solo coincide con `/beneficios/:path*`. El CSS y las fuentes del catálogo están aislados para no cambiar otras páginas, incluso tras navegar entre ellas.

## Diseño y archivos

La identidad sigue la app y las reglas del dashboard: Google Sans, Bricolage, Hugeicons, verde y lima. Cards de 24 px, controles de 16 px y banners de 28 px, con smooth corners. El logo del comercio aparece sobre la foto; el contador usa la moneda original y queda visible al hacer scroll. No agregar eyebrows.

- `components/catalogo-online`: catálogo, cards, header, login y acciones de usuario.
- `lib/catalogo-online`: modelos, consultas, rollout y composición de movimientos.
- `app/beneficios/catalogo.css`: estilos limitados a `.online-storefront`.
- `public/beneficios-assets/brand`: assets y licencias de fuentes.
- `app/beneficios/actions.ts`: canje por la Edge Function existente.
- `supabase/migrations/20261023182250_online_store_public_catalog.sql`: RPC pública con allowlist explícita, sin códigos de cupones ni datos internos del comercio.

El saldo viene de `profiles`, no de sumar los movimientos. Las transacciones de canje siguen siendo responsabilidad del backend existente.

## Entorno local de prueba

Se necesita una copia autorizada del repositorio privado `pasito` que contenga `supabase/roles.sql` y `supabase/migrations/20261021050000_prod_baseline.sql`. No copiar esos archivos a este repositorio público.

Desde la raíz de `pasito-web`, terminal 1:

```sh
npm ci --prefix scripts/testing/online-store-runtime
PASITO_BACKEND_ROOT=/ruta/al/checkout/pasito node scripts/testing/online_store_local.mjs
```

Terminal 2:

```sh
npm ci
# Solo en una copia nueva, sin reemplazar variables personales existentes:
cp .env.catalogo.example .env.local
npm run dev:catalogo
```

Abrir `http://127.0.0.1:54321/beneficios`. La API de prueba escucha solo en loopback, puerto 55321. Cuenta ficticia: `compras@pasito.test`; saldo inicial: 5.000. Consultar OTP en `http://127.0.0.1:55321/__test/mailbox`. Al cerrar el fixture se elimina su base temporal. Las fotos ficticias se cargan desde Unsplash.

No depender de procesos, bases o puertos auxiliares de una sesión previa. `.env.local`, bases, tokens y dependencias quedan fuera de Git. Para trabajar con un backend real usar sus variables y `NEXT_PUBLIC_LOCAL_TEST=false`.

El fixture simula OTP y el protocolo HTTP; ejecuta PostgreSQL, funciones, triggers y RLS reales. No ejecuta GoTrue, PostgREST, proveedores OAuth ni el runtime Edge desplegado.

## Validación

```sh
npm test
npm run test:catalogo
npm run build
PASITO_BACKEND_ROOT=/ruta/al/checkout/pasito npm run test:catalogo:db
```

Pasaron 160 pruebas existentes del sitio, 10 del catálogo y aislamiento de rutas/estilos, y 8 de PostgreSQL. El build completo y TypeScript pasaron. En navegador se recorrió catálogo → comercio → beneficio → canje ficticio → cupón, confirmando la actualización del saldo bajo `/beneficios`. El build sin secretos de eventos emite avisos de inventario no precargado y `metadataBase`, pero termina correctamente.

## Antes de producción

1. Revisar y aplicar la migración del catálogo en el entorno elegido; no se aplicó en remoto durante este trabajo.
2. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Preview. Nunca usar la service key existente del sitio para el catálogo cliente.
3. Autorizar el callback `/beneficios/auth/callback` para los dominios elegidos y comprobar la plantilla OTP con `{{ .Token }}`. Probar Google/Apple y la Edge Function real en staging.
4. Repetir el recorrido completo, responsive, teclado y errores en una preview protegida. Quitar noindex solo al lanzar.
5. `shared_code` aparece como próximo: el canje implementado usa `external_code`.
6. La idempotencia persiste por usuario/beneficio/pestaña. Volver al mismo beneficio puede devolver el cupón anterior: definir la UX de un nuevo canje legítimo antes de modificar esta garantía.
7. Revisar por separado los avisos de vulnerabilidades existentes en las dependencias del sitio; se mantuvo Next.js 16.2.10 y no se ejecutó una actualización masiva.

Usar el proyecto Vercel existente y las instrucciones de [beneficios](beneficios.md). El push puede generar una preview por la integración Git; no implica merge ni publicación en producción. No crear otro proyecto ni modificar DNS.
