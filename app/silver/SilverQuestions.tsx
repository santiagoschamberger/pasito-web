'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { SILVER_FAQS } from '@/lib/silver-faq'
import styles from './silver.module.css'
export function SilverQuestions({ aiEnabled }: { aiEnabled: boolean }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(
      new FormData(event.currentTarget).get('question') ?? '',
    ).trim()
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch('/api/events/silver/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(9000),
      })
      const data = await response.json()
      setResult(
        response.ok
          ? (data.faq?.answer ??
              'No encontramos una respuesta confirmada para esa pregunta. Contactanos y te ayudamos.')
          : (data.error ??
              'No pudimos buscar. Consultá las respuestas de abajo.'),
      )
    } catch {
      setResult(
        'No pudimos conectar. Todas las preguntas frecuentes siguen disponibles abajo.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      id="preguntas"
      className={`${styles.container} ${styles.questions}`}
      aria-labelledby="faq-title"
    >
      <div className={styles.questionsIntro}>
        <p className={styles.overline}>ANTES DE DAR EL PRIMER PASO</p>
        <h2>
          Antes de
          <br />
          <em>encontrarnos.</em>
        </h2>
        <p>
          Respuestas para organizar tu visita.
          <br />
          Si tenés alguna otra consulta, escribinos.
        </p>
        <Link href="/contacto" className={styles.textLink}>
          Contactanos <ArrowRight size={17} />
        </Link>
        {aiEnabled && (
          <>
            <form className={styles.questionSearch} onSubmit={search}>
              <input
                name="question"
                aria-label="Tu pregunta sobre Silver Walks by Nutren"
                placeholder="Escribí tu pregunta…"
                minLength={3}
                maxLength={300}
                required
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy}
                aria-label="Buscar respuesta"
              >
                <ArrowRight size={20} />
              </button>
            </form>
            <p>
              La búsqueda usa IA para encontrar respuestas de esta página. No
              incluyas datos personales o de salud.
            </p>
          </>
        )}
        <div role="status" aria-live="polite">
          {busy ? (
            <p className={styles.questionResult}>
              Buscando entre las respuestas…
            </p>
          ) : result ? (
            <p className={styles.questionResult}>{result}</p>
          ) : null}
        </div>
      </div>
      <div className={styles.questionList}>
        {SILVER_FAQS.map((faq) => (
          <details key={faq.id}>
            <summary>
              {faq.question}
              <Plus size={19} aria-hidden="true" />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
