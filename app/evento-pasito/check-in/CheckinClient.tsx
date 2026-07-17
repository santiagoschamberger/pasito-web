'use client'

import type { IScannerControls } from '@zxing/browser'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Keyboard, LogOut, RefreshCw, ShieldAlert, UserRound, X } from 'lucide-react'

import styles from './checkin.module.css'

type AuthState = 'loading' | 'login' | 'ready'
type CheckinResult = {
  status: 'admitted' | 'already_used' | 'void' | 'invalid' | 'error'
  code?: string
  customerName?: string | null
  customerEmail?: string
  ticketNumber?: number
  orderQuantity?: number
  checkedInAt?: string
  error?: string
}

function resultCopy(result: CheckinResult) {
  if (result.status === 'admitted') return { title: 'Puede ingresar', detail: 'Entrada validada correctamente.' }
  if (result.status === 'already_used') return { title: 'Ya fue utilizada', detail: result.checkedInAt ? `Ingresó a las ${new Date(result.checkedInAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}.` : 'Esta entrada ya registró un ingreso.' }
  if (result.status === 'void') return { title: 'Entrada anulada', detail: 'El pago fue anulado, reembolsado o está en disputa.' }
  if (result.status === 'invalid') return { title: 'Entrada inválida', detail: result.error || 'El QR o código no pertenece a este evento.' }
  return { title: 'No pudimos validarla', detail: result.error || 'Revisá la conexión e intentá nuevamente.' }
}

export function CheckinClient() {
  const [auth, setAuth] = useState<AuthState>('loading')
  const [operator, setOperator] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    const savedOperator = window.localStorage.getItem('tomate-checkin-operator')
    if (savedOperator) setOperator(savedOperator)
    fetch('/api/events/tomate/check-in/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('session-check-failed')
        const payload = await response.json() as { authenticated?: boolean; operator?: string }
        if (!payload.authenticated) {
          setAuth('login')
          return
        }
        if (payload.operator) setOperator(payload.operator)
        setAuth('ready')
      })
      .catch(() => setAuth('login'))
  }, [])

  useEffect(() => () => controlsRef.current?.stop(), [])

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setCameraActive(false)
  }, [])

  const redeem = useCallback(async (value: string) => {
    if (processingRef.current) return
    processingRef.current = true
    setChecking(true)
    setCameraError(null)
    stopCamera()
    try {
      const response = await fetch('/api/events/tomate/check-in/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      const payload = await response.json().catch(() => ({})) as CheckinResult
      if (response.status === 401) {
        setAuth('login')
        throw new Error('La sesión venció. Volvé a ingresar.')
      }
      const next = payload.status ? payload : { status: 'error' as const, error: 'Respuesta inválida.' }
      setResult(next)
      if (navigator.vibrate) navigator.vibrate(next.status === 'admitted' ? 100 : [100, 80, 100])
    } catch (cause) {
      setResult({ status: 'error', error: cause instanceof Error ? cause.message : 'No pudimos validar la entrada.' })
    } finally {
      setChecking(false)
      processingRef.current = false
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setResult(null)
    setCameraError(null)
    stopCamera()
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 })
      const controls = await reader.decodeFromConstraints({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      }, videoRef.current ?? undefined, (decoded) => {
        if (decoded) void redeem(decoded.getText())
      })
      controlsRef.current = controls
      setCameraActive(true)
    } catch (cause) {
      console.error('[tomate/check-in] Cámara no disponible:', cause)
      setCameraError('No pudimos abrir la cámara. Permití el acceso o usá el código manual.')
      setCameraActive(false)
    }
  }, [redeem, stopCamera])

  async function login(event: FormEvent) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError(null)
    try {
      const response = await fetch('/api/events/tomate/check-in/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator, password }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No pudimos ingresar.')
      window.localStorage.setItem('tomate-checkin-operator', operator)
      setPassword('')
      setAuth('ready')
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : 'No pudimos ingresar.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function logout() {
    stopCamera()
    await fetch('/api/events/tomate/check-in/session', { method: 'DELETE' }).catch(() => undefined)
    setAuth('login')
    setPassword('')
    setResult(null)
  }

  function submitManual(event: FormEvent) {
    event.preventDefault()
    if (manualCode.trim()) void redeem(manualCode)
  }

  if (auth === 'loading') {
    return <main className={styles.page}><div className={styles.loading}><RefreshCw size={25} /> Cargando acceso…</div></main>
  }

  if (auth === 'login') {
    return (
      <main className={styles.page}>
        <form className={styles.loginCard} onSubmit={login} data-testid="checkin-login">
          <span className={styles.loginIcon}><UserRound size={27} /></span>
          <p>Equipo Pasito</p>
          <h1>Ingreso al check-in</h1>
          <label htmlFor="operator">Tu nombre</label>
          <input id="operator" value={operator} onChange={(event) => setOperator(event.target.value)} autoComplete="name" required placeholder="Ej. Santi" />
          <label htmlFor="checkin-password">Clave del equipo</label>
          <input id="checkin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          {loginError && <div className={styles.error} role="alert">{loginError}</div>}
          <button type="submit" disabled={loggingIn}>{loggingIn ? 'Validando…' : 'Entrar al scanner'}</button>
        </form>
      </main>
    )
  }

  if (result) {
    const copy = resultCopy(result)
    return (
      <main className={`${styles.page} ${styles[`page_${result.status}`]}`}>
        <section className={styles.resultCard} data-testid={`checkin-result-${result.status}`}>
          <span className={styles.resultIcon}>{result.status === 'admitted' ? <Check size={48} /> : result.status === 'already_used' ? <ShieldAlert size={48} /> : <X size={48} />}</span>
          <p>{result.status === 'admitted' ? 'Validada' : 'Atención'}</p>
          <h1>{copy.title}</h1>
          <div className={styles.attendee}>
            {result.customerName && <strong>{result.customerName}</strong>}
            {result.customerEmail && <span>{result.customerEmail}</span>}
            {result.code && <code>{result.code}</code>}
            {result.ticketNumber && <small>Entrada {result.ticketNumber} de {result.orderQuantity}</small>}
          </div>
          <p className={styles.resultDetail}>{copy.detail}</p>
          <button type="button" onClick={() => setResult(null)}><Camera size={20} /> Siguiente entrada</button>
          <button type="button" className={styles.manualNext} onClick={() => { setResult(null); setManualCode('') }}><Keyboard size={18} /> Usar código manual</button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.scannerCard}>
        <header>
          <div><p>Pasito × TOMATE</p><h1>Check-in</h1><span>Operador: {operator}</span></div>
          <button type="button" onClick={() => void logout()} aria-label="Cerrar sesión"><LogOut size={20} /></button>
        </header>

        <div className={`${styles.camera} ${cameraActive ? styles.cameraActive : ''}`}>
          <video ref={videoRef} muted playsInline />
          <span className={styles.scanFrame} />
          {!cameraActive && <button type="button" onClick={() => void startCamera()}><Camera size={24} /> Abrir cámara</button>}
        </div>
        {cameraError && <div className={styles.error}>{cameraError}</div>}
        {checking && <div className={styles.checking}><RefreshCw size={18} /> Validando entrada…</div>}

        <div className={styles.separator}><span>o ingresá el código</span></div>
        <form className={styles.manualForm} onSubmit={submitManual}>
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} placeholder="AB12CD34EF" inputMode="text" autoCapitalize="characters" maxLength={14} aria-label="Código manual de entrada" />
          <button type="submit" disabled={checking || !manualCode.trim()}>Validar</button>
        </form>
      </section>
    </main>
  )
}
