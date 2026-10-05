'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { Check, Loader2 } from 'lucide-react'

import styles from './club.module.css'

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error'

export function PasitoClubLanding() {
  const inputId = useId()
  const messageId = useId()
  const notifyId = useId()
  const [email, setEmail] = useState('')
  const [notifyTickets, setNotifyTickets] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function fail(text: string) {
    setStatus('error')
    setMessage(text)
    inputRef.current?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'loading') return

    const value = email.trim()
    if (!value || !inputRef.current?.checkValidity()) {
      fail('Revisá tu mail, parece que no es válido.')
      return
    }

    const form = new FormData(event.currentTarget)
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/pasito-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, notifyTickets, website: form.get('website') ?? '' }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; already?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        fail(data.error ?? 'No pudimos anotarte. Probá de nuevo.')
        return
      }
      setStatus(data.already ? 'already' : 'success')
    } catch {
      fail('Sin conexión. Revisá tu internet y probá de nuevo.')
    }
  }

  const done = status === 'success' || status === 'already'

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pasito-club/logo.svg" alt="Pasito Club" width={747} height={320} />
        </h1>

        <section className={styles.card} aria-live="polite">
          {done ? (
            <div className={styles.success} role="status">
              <span className={styles.successIcon} aria-hidden="true">
                <Check />
              </span>
              <h2 className={styles.successTitle}>
                {status === 'already' ? 'Ya estabas en la lista' : '¡Listo, estás en la lista!'}
              </h2>
              <p className={styles.successText}>
                {status === 'already'
                  ? 'Tu lugar sigue guardado. Te avisamos cuando arranque Pasito Club.'
                  : `Te vamos a escribir a ${email.trim()} cuando arranque Pasito Club.`}
                {notifyTickets ? ' También te avisamos cuando estén las entradas.' : ''}
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={status === 'loading'}>
              <label htmlFor={inputId} className={styles.label}>
                Sumate a la lista
              </label>
              <input
                ref={inputRef}
                id={inputId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                required
                maxLength={254}
                placeholder="tu@mail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === 'error') setStatus('idle')
                }}
                aria-invalid={status === 'error'}
                aria-describedby={messageId}
                className={styles.input}
              />
              {status === 'error' ? (
                <p id={messageId} className={styles.error} role="alert">
                  {message}
                </p>
              ) : (
                <span id={messageId} hidden />
              )}

              <label htmlFor={notifyId} className={styles.checkbox}>
                <input
                  id={notifyId}
                  type="checkbox"
                  name="notifyTickets"
                  checked={notifyTickets}
                  onChange={(e) => setNotifyTickets(e.target.checked)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxBox} aria-hidden="true">
                  <Check />
                </span>
                <span>Avisame cuando estén las entradas</span>
              </label>

              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className={styles.honeypot}
                aria-hidden="true"
              />

              <button type="submit" className={styles.button} disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Loader2 className={styles.spin} aria-hidden="true" />
                    Anotando…
                  </>
                ) : (
                  'Quiero sumarme'
                )}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
