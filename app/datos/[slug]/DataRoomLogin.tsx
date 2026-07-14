'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'

export function DataRoomLogin({ slug }: { slug: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/data-room/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      })
      const data = await response.json().catch(() => null) as { error?: string } | null

      if (!response.ok) {
        throw new Error(data?.error ?? 'No se pudo validar el acceso.')
      }

      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo validar el acceso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F5F7F4] px-5 py-10 text-[#17201B]">
      <section className="w-full max-w-[420px] rounded-xl border border-[#DDE6DF] bg-white p-7 shadow-sm sm:p-9">
        <img src="/brand/logo-green.svg" alt="Pasito" className="mb-10 h-8 w-auto" />
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-[#EDF5EF] text-[#0B6B43]">
          <LockKeyhole size={21} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Sala de datos</h1>
        <p className="mt-2 text-sm leading-6 text-[#66706B]">
          Ingresá la contraseña que te compartió el equipo de Pasito.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="data-room-password" className="mb-2 block text-sm font-semibold">
              Contraseña
            </label>
            <input
              id="data-room-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={4}
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#CBD7CE] bg-white px-3 text-base outline-none transition focus:border-[#0B6B43] focus:ring-2 focus:ring-[#0B6B43]/15"
              aria-describedby={error ? 'data-room-error' : undefined}
            />
          </div>

          {error ? (
            <p id="data-room-error" role="alert" className="text-sm font-medium text-[#B14D3B]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || password.length < 4}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0B6B43] px-4 text-sm font-semibold text-white transition hover:bg-[#085737] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? 'Validando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-7 border-t border-[#E8EDE9] pt-5 text-xs leading-5 text-[#79817C]">
          Información confidencial. Los accesos y las vistas quedan registrados.
        </p>
      </section>
    </main>
  )
}
