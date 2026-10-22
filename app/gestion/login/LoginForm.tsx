'use client'

import { FormEvent, useState } from 'react'
import { MailCheck } from 'lucide-react'

import { cn } from '@/lib/utils'
import { api } from '../_components/api'
import { btnPrimary, input, label } from '../_components/ui'

export function LoginForm({ next, initialError, token }: { next: string; initialError: string | null; token: string | null }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)
  const [devLink, setDevLink] = useState<string | null>(null)

  // Viene del mail: un toque confirma (los antivirus que abren links no gastan el acceso).
  if (token) {
    return (
      <form method="post" action="/api/gestion/auth/verify" className="space-y-5">
        <div>
          <h1 className="g-display text-3xl font-extrabold">¡Hola de nuevo!</h1>
          <p className="mt-1 text-[#5F6761]">Tocá para entrar a Eventos Pasito.</p>
        </div>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="next" value={next} />
        <button className={cn(btnPrimary, 'h-12 w-full text-base')} autoFocus>Entrar</button>
      </form>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api<{ devLink?: string }>('/api/gestion/auth/request', { body: { email, next }, quiet: true })
      setSent(true)
      if (result.devLink) setDevLink(result.devLink)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos mandar el mail.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#EBFA61] text-[#00402E]"><MailCheck className="size-7" /></span>
        <h1 className="g-display text-3xl font-extrabold">Revisá tu mail</h1>
        <p className="text-[#5F6761]">Te mandamos un link a <strong className="text-[#171D1A]">{email}</strong>. Vence en 20 minutos.</p>
        <button className="text-sm font-semibold text-[#006D42]" onClick={() => setSent(false)}>Usar otro mail</button>
        {devLink && <a className="block break-all text-sm text-[#006D42] underline" href={devLink}>{devLink}</a>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="g-display text-3xl font-extrabold">Entrar</h1>
        <p className="mt-1 text-[#5F6761]">Con tu mail @pasito.app. Te llega un link, sin contraseñas.</p>
      </div>
      <label className="block space-y-1.5">
        <span className={label}>Email</span>
        <input className={cn(input, 'h-12 text-base')} type="email" required autoFocus autoComplete="email" placeholder="vos@pasito.app" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p className="rounded-lg bg-[#FDECE8] px-3 py-2 text-sm font-medium text-[#B14D3B]">{error}</p>}
      <button className={cn(btnPrimary, 'h-12 w-full text-base')} disabled={loading}>{loading ? 'Enviando…' : 'Mandarme el link'}</button>
    </form>
  )
}
