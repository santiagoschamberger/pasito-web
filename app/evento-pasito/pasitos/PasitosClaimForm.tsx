'use client'

import { FormEvent, useState } from 'react'
import { Check, Gift, LoaderCircle } from 'lucide-react'

import styles from './pasitos.module.css'

export function PasitosClaimForm({
  token,
  amount,
  entries,
}: {
  token: string
  amount: number
  entries: Array<{ amount: number; ticketNumber: number }>
}) {
  const [supportIds, setSupportIds] = useState(() => entries.map(() => ''))
  const [sameForAll, setSameForAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [credited, setCredited] = useState(false)

  const updateSupportId = (index: number, value: string) => {
    setSupportIds((current) => current.map((supportId, position) => position === index ? value : supportId))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const submittedIds = sameForAll
        ? entries.map(() => supportIds[0]?.trim() ?? '')
        : supportIds.map((supportId) => supportId.trim())
      const response = await fetch('/api/events/tomate/pasitos/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, supportIds: submittedIds }),
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
      <div className={`${styles.claimCard} ${styles.credited}`} role="status">
        <span className={styles.icon}><Check size={22} /></span>
        <div>
          <strong>¡Listo! Acreditamos {amount} Pasitos.</strong>
          <p>Ya están repartidos entre {entries.length === 1 ? 'la cuenta indicada' : 'las cuentas indicadas'}. Este enlace no puede volver a usarse.</p>
        </div>
      </div>
    )
  }

  return (
    <form className={styles.claimCard} onSubmit={submit}>
      <span className={styles.icon}><Gift size={22} /></span>
      <div className={styles.formBody}>
        <strong>Tenés {amount} Pasitos para repartir</strong>
        <p>Copiá desde la app un ID de soporte por entrada. Validamos todos juntos antes de acreditar.</p>

        {entries.length > 1 && (
          <label className={styles.sameForAll}>
            <input
              type="checkbox"
              checked={sameForAll}
              onChange={(event) => setSameForAll(event.target.checked)}
              disabled={submitting}
            />
            <span>Usar el mismo ID para todas las entradas</span>
          </label>
        )}

        <div className={styles.ticketFields}>
          {(sameForAll ? entries.slice(0, 1) : entries).map((entry, index) => (
            <label className={styles.ticketField} key={entry.ticketNumber}>
              <span>
                {sameForAll ? `Todas las entradas (${entries.length})` : `Entrada ${entry.ticketNumber}`}
                <small>{sameForAll ? `Total: ${amount} Pasitos` : `+${entry.amount} Pasitos`}</small>
              </span>
              <input
                className={styles.supportInput}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={supportIds[index] ?? ''}
                onChange={(event) => updateSupportId(index, event.target.value)}
                placeholder="ID de soporte"
                required
                minLength={36}
                maxLength={36}
                disabled={submitting}
              />
            </label>
          ))}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? <><LoaderCircle size={17} className={styles.spinner} /> Acreditando…</> : 'Confirmar y acreditar'}
        </button>
      </div>
    </form>
  )
}
