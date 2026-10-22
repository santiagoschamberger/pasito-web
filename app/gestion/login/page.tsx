import type { Metadata } from 'next'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

const ERRORS: Record<string, string> = {
  vencido: 'El link venció o ya se usó. Pedí uno nuevo.',
  link: 'El link no es válido.',
  acceso: 'Ese mail no tiene acceso. Pedíselo a un admin.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; token?: string }> }) {
  const { next, error, token } = await searchParams
  const safeNext = next?.startsWith('/gestion') && !next.startsWith('//') ? next : '/gestion'
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#00402E] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-white.svg" alt="Pasito" className="h-7 w-auto self-start" />
        <div className="relative z-10 max-w-md">
          <p className="text-sm font-bold tracking-wider text-[#EBFA61] uppercase">Eventos Pasito</p>
          <h1 className="g-display mt-2 text-5xl leading-[1.05] font-extrabold">Cada evento, en un solo lugar.</h1>
          <p className="mt-4 text-lg text-white/80">Plata, sponsors, tareas, proveedores y la puerta. Las entradas de la web se suman solas.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/paloma.png" alt="" className="pointer-events-none absolute -right-10 -bottom-10 h-[420px] opacity-90" />
      </section>
      <section className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-green.svg" alt="Pasito" className="mb-8 h-7 w-auto lg:hidden" />
          <LoginForm next={safeNext} initialError={error ? ERRORS[error] ?? null : null} token={token && token.length < 100 ? token : null} />
        </div>
      </section>
    </main>
  )
}
