'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

export function WaitlistForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Algo salió mal. Intentá de nuevo.')
        setStatus('error')
        return
      }

      setStatus('success')
      router.refresh()
    } catch {
      setErrorMsg('Sin conexión. Intentá de nuevo.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: '#EEFA7A' }}
        >
          <CheckCircle2 size={24} style={{ color: '#0C6B45' }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-white text-lg leading-tight">¡Listo, ya estás anotado!</p>
          <p className="text-white/60 text-sm mt-1">Te avisamos cuando Pasito esté disponible.</p>
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          disabled={status === 'loading'}
          className="flex-1 min-w-0 h-13 px-4 rounded-2xl text-base outline-none transition-all disabled:opacity-60"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            color: '#fff',
            caretColor: '#EEFA7A',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#EEFA7A')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="h-13 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shrink-0"
          style={{ background: '#EEFA7A', color: '#0C6B45' }}
        >
          {status === 'loading' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Anotarme
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-xs mt-2 px-1" style={{ color: '#fca5a5' }}>
          {errorMsg}
        </p>
      )}

      <p className="text-xs mt-2 px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Sin spam. Te avisamos cuando lancemos, nada más.
      </p>
    </form>
  )
}
