import type { Metadata } from 'next'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

const ERRORS: Record<string, string> = {
  vencido: 'El link venció o ya se usó. Pedí uno nuevo.',
  link: 'El link no es válido.',
  acceso: 'Ese mail no tiene acceso. Pedíselo a un admin.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-xl font-extrabold text-[#006D42]">
          <span className="grid size-9 place-items-center rounded-lg bg-[#006D42] text-[#EBFA61]">P</span>
          Eventos Pasito
        </div>
        <LoginForm next={next?.startsWith('/gestion') ? next : '/gestion'} initialError={error ? ERRORS[error] ?? null : null} />
      </div>
    </main>
  )
}
