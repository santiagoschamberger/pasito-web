'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export function UruguayWaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error ?? 'Algo salió mal. Intentá de nuevo.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Sin conexión. Intentá de nuevo.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow">
          <CheckCircle2 aria-hidden size={24} className="text-green" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight text-white">Listo, ya estás anotado.</p>
          <p className="mt-1 text-sm text-white/65">Te avisamos apenas Pasito llegue a Uruguay.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          disabled={status === 'loading'}
          className="h-13 min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/12 px-4 text-base text-white outline-none transition placeholder:text-white/38 focus:border-yellow disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="flex h-13 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-yellow px-5 text-sm font-bold text-green transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'loading' ? (
            <Loader2 aria-hidden size={18} className="animate-spin" />
          ) : (
            <>
              Anotarme
              <ArrowRight aria-hidden size={15} />
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <p className="mt-2 px-1 text-xs text-red-200">
          {errorMsg}
        </p>
      )}
    </form>
  )
}
