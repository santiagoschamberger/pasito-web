'use client'

import { FormEvent, useState } from 'react'
import { Check, Mail } from 'lucide-react'

import styles from './recovery.module.css'

export function RecoveryForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/events/tomate/tickets/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No pudimos procesar el pedido.')
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos procesar el pedido.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className={styles.done} data-testid="recovery-done">
        <span><Check size={28} /></span>
        <h2>Revisá tu email</h2>
        <p>Si encontramos una compra aprobada con <strong>{email}</strong>, te enviamos todos los QR y códigos nuevamente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <label htmlFor="recovery-email">Email usado para pagar</label>
      <div className={styles.inputWrap}>
        <Mail size={19} />
        <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@email.com" />
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={sending}>{sending ? 'Buscando entradas…' : 'Reenviar mis entradas'}</button>
      <small>Por seguridad, mostramos la misma confirmación exista o no una compra con ese email.</small>
    </form>
  )
}
