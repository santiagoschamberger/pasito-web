'use client'

import { FormEvent, useState } from 'react'
import { Check, Gift, LoaderCircle } from 'lucide-react'

import styles from './pasitos.module.css'

export function PasitosClaimForm({
  token,
  amount,
  compact = false,
}: {
  token: string
  amount: number
  compact?: boolean
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [credited, setCredited] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/events/tomate/pasitos/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No pudimos acreditar los Pasitos.')
      setCredited(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos acreditar los Pasitos.')
    } finally {
      setSubmitting(false)
    }
  }

  if (credited) {
    return (
      <div className={`${styles.claimCard} ${compact ? styles.compact : ''} ${styles.credited}`} role="status">
        <span className={styles.icon}><Check size={22} /></span>
        <div>
          <strong>¡Listo! Acreditamos {amount} Pasitos.</strong>
          <p>Ya los vas a ver en tu cuenta de Pasito.</p>
        </div>
      </div>
    )
  }

  return (
    <form className={`${styles.claimCard} ${compact ? styles.compact : ''}`} onSubmit={submit}>
      <span className={styles.icon}><Gift size={22} /></span>
      <div className={styles.formBody}>
        <strong>Tenés {amount} Pasitos para acreditar</strong>
        <p>Ingresá el email con el que usás la app Pasito.</p>
        <label>
          <span>Email de tu cuenta Pasito</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vos@email.com"
            required
            maxLength={254}
            disabled={submitting}
          />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? <><LoaderCircle size={17} className={styles.spinner} /> Acreditando…</> : 'Acreditar mis Pasitos'}
        </button>
      </div>
    </form>
  )
}
