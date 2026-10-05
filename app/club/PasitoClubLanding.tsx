'use client'

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

import { pasitoClubTypingProgress } from '@/lib/pasito-club-waitlist'
import styles from './club.module.css'

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error'

const ROWS = 11
const FLIP_ORDER = [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10]
const STEP_DISTANCE = 64
const MAX_FOOTPRINTS = 36
const IDLE_WALK_AFTER_MS = 2200

const FOOT_SVG =
  '<svg viewBox="0 0 24 44" aria-hidden="true"><ellipse cx="12" cy="16" rx="7.2" ry="10"/><ellipse cx="12.6" cy="35" rx="5.4" ry="7"/><circle cx="5.6" cy="4.6" r="2.4"/><circle cx="10.2" cy="2.8" r="2.4"/><circle cx="14.8" cy="3" r="2.2"/><circle cx="18.6" cy="5.4" r="2"/></svg>'

function TrackRow({ index, done }: { index: number; done: boolean }) {
  const phrase = done ? 'CORRÍ 3K' : 'YO NO CORRO'
  const words = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className={styles.word}>
      {phrase}
      <span className={styles.cross}>×</span>
    </span>
  ))

  return (
    <div
      className={`${styles.row} ${done ? styles.rowDone : ''}`}
      style={{ ['--row' as string]: index }}
      data-direction={index % 2 === 0 ? 'left' : 'right'}
    >
      <div key={phrase} className={styles.rowTrack}>
        {words}
        {words}
      </div>
    </div>
  )
}

export function PasitoClubLanding() {
  const inputId = useId()
  const messageId = useId()
  const notifyId = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [hop, setHop] = useState(0)
  const [shake, setShake] = useState(0)
  const [notifyTickets, setNotifyTickets] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const footLayerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const finished = status === 'success' || status === 'already'
  const progress = finished ? 1 : pasitoClubTypingProgress(email)
  const doneRows = new Set(FLIP_ORDER.slice(0, Math.round(progress * ROWS)))

  const spawnFootprint = useCallback((x: number, y: number, angle: number, side: number) => {
    const layer = footLayerRef.current
    if (!layer) return
    const offset = 11 * side
    const rad = (angle * Math.PI) / 180
    const fx = x + Math.cos(rad) * offset
    const fy = y + Math.sin(rad) * offset
    const foot = document.createElement('span')
    foot.className = styles.foot
    foot.innerHTML = FOOT_SVG
    foot.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -50%) rotate(${angle}deg) scaleX(${side})`
    foot.addEventListener('animationend', () => foot.remove())
    layer.appendChild(foot)
    while (layer.childElementCount > MAX_FOOTPRINTS) layer.firstElementChild?.remove()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let last: { x: number; y: number } | null = null
    let side = 1
    let lastMove = performance.now()
    let raf = 0
    let walker: { x: number; y: number; t: number; dir: number; baseY: number } | null = null

    const step = (x: number, y: number) => {
      if (!last) {
        last = { x, y }
        return
      }
      const dx = x - last.x
      const dy = y - last.y
      if (Math.hypot(dx, dy) < STEP_DISTANCE) return
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
      spawnFootprint(x, y, angle, side)
      side *= -1
      last = { x, y }
    }

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      stage.style.setProperty('--mx', `${x}px`)
      stage.style.setProperty('--my', `${y}px`)
      if (walker) {
        walker = null
        last = null
      }
      lastMove = performance.now()
      step(x, y)
    }

    const tick = (now: number) => {
      if (now - lastMove > IDLE_WALK_AFTER_MS) {
        const { width, height } = stage.getBoundingClientRect()
        if (!walker) {
          const dir = Math.random() > 0.5 ? 1 : -1
          walker = { x: dir > 0 ? -40 : width + 40, y: 0, t: 0, dir, baseY: height * (0.18 + Math.random() * 0.64) }
          last = null
        }
        walker.t += 1
        walker.x += walker.dir * 2.1
        walker.y = walker.baseY + Math.sin(walker.t / 38) * 46
        step(walker.x, walker.y)
        if (walker.x < -60 || walker.x > width + 60) walker = null
      }
      raf = requestAnimationFrame(tick)
    }

    stage.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [spawnFootprint])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'loading') return

    const form = new FormData(event.currentTarget)
    const value = email.trim()
    if (!inputRef.current?.checkValidity() || !value) {
      setStatus('error')
      setMessage('Ese mail no camina. Revisalo.')
      setShake((n) => n + 1)
      inputRef.current?.focus()
      return
    }

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
        setStatus('error')
        setMessage(data.error ?? 'Se nos trabó el paso. Probá de nuevo.')
        setShake((n) => n + 1)
        inputRef.current?.focus()
        return
      }
      setStatus(data.already ? 'already' : 'success')
      setHop((n) => n + 1)
    } catch {
      setStatus('error')
      setMessage('Sin señal en la pista. Revisá tu conexión y probá de nuevo.')
      setShake((n) => n + 1)
      inputRef.current?.focus()
    }
  }

  return (
    <main ref={stageRef} className={styles.stage} data-finished={finished || undefined}>
      <div className={styles.track} aria-hidden="true">
        {Array.from({ length: ROWS }, (_, i) => (
          <TrackRow key={i} index={i} done={doneRows.has(i)} />
        ))}
      </div>
      <div className={styles.spotlight} aria-hidden="true" />
      <div ref={footLayerRef} className={styles.footLayer} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.center}>
        <h1 className={styles.logoWrap}>
          <span className={styles.logo} data-hop={hop === 0 ? undefined : hop % 2}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pasito-club/logo.svg" alt="Pasito Club" width={747} height={320} draggable={false} />
          </span>
        </h1>

        {finished ? (
          <div className={styles.bib} role="status" aria-live="polite">
            <span className={styles.pin} data-corner="tl" aria-hidden="true" />
            <span className={styles.pin} data-corner="tr" aria-hidden="true" />
            <span className={styles.pin} data-corner="bl" aria-hidden="true" />
            <span className={styles.pin} data-corner="br" aria-hidden="true" />
            <span className={styles.bibLabel}>Dorsal · Temporada 2026</span>
            <span className={styles.bibNumber} aria-hidden="true">3K</span>
            <p className={styles.bibTitle}>
              {status === 'already' ? 'Ya estabas en la largada.' : 'Estás adentro.'}
            </p>
            <p className={styles.bibText}>
              {status === 'already'
                ? 'Tu lugar sigue guardado. Te avisamos cuando arranque el club.'
                : `Te escribimos a ${email.trim()} cuando arranque el club.`}
            </p>
            {notifyTickets ? <p className={styles.bibTickets}>Y te avisamos apenas salgan las entradas.</p> : null}
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
            data-state={status}
            aria-busy={status === 'loading'}
          >
            <label htmlFor={inputId} className={styles.srOnly}>
              Tu mail para sumarte a la lista de Pasito Club
            </label>
            <div className={styles.field} data-shake={shake === 0 ? undefined : shake % 2}>
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
                  if (e.target.value.length > email.length) setHop((n) => n + 1)
                  if (status === 'error') setStatus('idle')
                }}
                aria-invalid={status === 'error'}
                aria-describedby={messageId}
                className={styles.input}
              />
              <button type="submit" className={styles.submit} disabled={status === 'loading'}>
                <span className={styles.submitText}>{status === 'loading' ? 'Anotando' : 'Quiero mi lugar'}</span>
                {status === 'loading' ? (
                  <Loader2 className={styles.spin} aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </button>
            </div>
            <label htmlFor={notifyId} className={styles.notify}>
              <input
                id={notifyId}
                type="checkbox"
                name="notifyTickets"
                checked={notifyTickets}
                onChange={(e) => setNotifyTickets(e.target.checked)}
                className={styles.notifyInput}
              />
              <span className={styles.notifyBox} aria-hidden="true">
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
            <p id={messageId} className={styles.message} role="alert" aria-live="assertive">
              {status === 'error' ? message : ''}
            </p>
          </form>
        )}
      </div>

      <p className={styles.tagline}>No buscamos runners. Los vamos a crear.</p>
    </main>
  )
}
