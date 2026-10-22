'use client'

import { FormEvent, useState } from 'react'
import { MailCheck } from 'lucide-react'

import { api } from '../_components/api'
import { btnPrimary, card, input, label } from '../_components/ui'

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)
  const [devLink, setDevLink] = useState<string | null>(null)

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
      <div className={`${card} p-6`}>
        <MailCheck className="mb-3 size-8 text-[#006D42]" />
        <h1 className="text-lg font-bold">Revisá tu mail</h1>
        <p className="mt-1 text-sm text-[#5F6761]">Te mandamos un link a <strong>{email}</strong>. Vence en 20 minutos.</p>
        {devLink && <a className="mt-3 block break-all text-sm text-[#006D42] underline" href={devLink}>{devLink}</a>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-4 p-6`}>
      <div>
        <h1 className="text-lg font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-[#5F6761]">Con tu mail @pasito.app. Te llega un link, sin contraseñas.</p>
      </div>
      <label className="block space-y-1.5">
        <span className={label}>Email</span>
        <input className={input} type="email" required autoFocus autoComplete="email" placeholder="vos@pasito.app" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p className="text-sm font-medium text-[#B14D3B]">{error}</p>}
      <button className={`${btnPrimary} w-full`} disabled={loading}>{loading ? 'Enviando…' : 'Mandarme el link'}</button>
    </form>
  )
}
