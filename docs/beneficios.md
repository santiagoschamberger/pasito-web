# Catálogo online de beneficios

## Base y objetivo

- Repositorio: `santiagoschamberger/pasito-web`.
- Rama de trabajo: `codex/catalogo-online`, creada desde `main`.
- Ruta pública prevista: `https://pasito.app/beneficios`.
- La web actualmente redirige el dominio raíz a `www.pasito.app`, conservando la ruta. Por eso la URL canónica es `https://www.pasito.app/beneficios`.
- Proyecto existente de Vercel: `pasito-waitlist` (equipo `pasito-aa7e95c2`, ID `team_y36mJQbsgohcrZTNQuBbdgdF`). Los dominios `pasito.app` y `www.pasito.app` ya están asociados a ese proyecto.

Verificado el 23/10/2026: Vercel tiene conectado este repositorio de GitHub, la rama de producción es `main`, la raíz es `.` y el proyecto usa Next.js con Node.js 24.x.

La rama incluye el catálogo online, login, canje web, historial, comercio y detalle de Pasitos. Todo vive bajo `/beneficios`. Sin `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, se conserva la página de preparación original en `app/beneficios/preparation.tsx`. Para continuar el trabajo y levantar datos ficticios, consultar [el handoff](catalogo-online-handoff.md). El resto de la aplicación mantiene sus requisitos de entorno existentes.

## Empezar

En una copia limpia del repositorio:

```sh
git fetch origin
git switch --track origin/codex/catalogo-online
npm ci
npm run dev
```

Si ya tenés la rama local, usá `git switch codex/catalogo-online` y `git pull --ff-only`. Abrí `http://localhost:3000/beneficios`.

## Dónde desarrollar

- `app/beneficios/page.tsx`: catálogo y metadatos; conserva el canonical y noindex originales.
- `app/beneficios/layout.tsx` y `catalogo.css`: shell y estilos limitados a `.online-storefront`.
- `app/beneficios/[id]`, `comercios/[id]`, `canjes`, `pasitos`, `ingresar` y `auth/callback`: detalle y cuenta.
- `components/catalogo-online` y `lib/catalogo-online`: componentes, dominio y acceso autenticado.
- `proxy.ts`: renovación de sesión exclusivamente para `/beneficios/:path*`.
- `components/marketing/Marketing.tsx`, `app/marketing.module.css` y `beneficios.module.css`: se conservan para la página de preparación.

La consulta pública usa `get_online_store_catalog`, definida en la nueva migración, aún no aplicada en remoto. La web reutiliza la Edge Function `redeem-external-code` y los controles existentes de saldo, disponibilidad, rollout e idempotencia. Solo se permite una clave pública en el navegador; nunca una service key.

La página inicial tiene `robots.index: false` para evitar indexar una pantalla en preparación. Quitar esa restricción al lanzar el catálogo terminado. No se agregó un enlace nuevo al menú global para promocionar una funcionalidad aún en desarrollo.

## Validación antes de subir

```sh
npm test
npm run test:catalogo
npm run build
```

Revisar `/beneficios` en escritorio y móvil, enlaces de descarga, navegación a comercios, teclado y ausencia de errores de consola. Para el catálogo real, agregar pruebas de la integración y sus estados.

## Vercel: preview y producción

Usar **el proyecto existente `pasito-waitlist`**, con framework Next.js, raíz del repositorio, Node.js 24.x y build `npm run build`. No crear otro proyecto ni cambiar DNS: `/beneficios` es una ruta de esta misma aplicación.

1. Subir commits a `codex/catalogo-online` y abrir un PR hacia `main`.
2. En la integración Git de Vercel, verificar que el repositorio sea `santiagoschamberger/pasito-web`, que `main` sea la rama de producción y que las previews estén habilitadas para esta rama. Con esa integración activa, los pushes generan previews.
3. Abrir la URL del deployment de la rama y agregar `/beneficios`. Las previews del proyecto tienen protección de Vercel: los devs deben tener acceso al equipo. Verificar las variables del entorno **Preview** si otra parte de la app las necesita. Gestionar secretos desde Vercel; no subir archivos `.env` al repositorio.
4. Cuando el catálogo esté probado y aprobado, actualizar la rama con `main`, repetir la validación e integrar el PR. Con el deploy automático de producción habilitado, el push a `main` publica la aplicación completa, incluida `/beneficios`.
5. Comprobar `https://pasito.app/beneficios` y su destino `https://www.pasito.app/beneficios` después del deploy.

Un deploy de preview no cambia `pasito.app`. Esta rama prepara el trabajo; no cambia la rama de producción ni las reglas de dominios. La configuración Git de Vercel y el resultado de cada build deben verificarse en el panel antes de dar un deploy por publicado.
