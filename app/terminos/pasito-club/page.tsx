import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import marketingStyles from '@/app/marketing.module.css'
import { PASITO_CLUB_EVENT, PASITO_CLUB_RACE, PASITO_CLUB_RACE_MIN_PACK, PASITO_CLUB_TRAININGS } from '@/lib/pasito-club-event'

export const metadata: Metadata = {
  title: 'Bases y condiciones - Pasito Club',
  description: 'Bases y condiciones de Pasito Club, temporada 2026.',
}

const h2 = {
  fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
  fontSize: '26px',
  fontWeight: 700,
  lineHeight: '32px',
  letterSpacing: '-.6px',
} as const
const p = { marginTop: '12px', color: '#585843', fontSize: '16px', lineHeight: '26px' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: '40px' }}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  )
}

export default function PasitoClubTermsPage() {
  const first = PASITO_CLUB_TRAININGS[0]
  const last = PASITO_CLUB_TRAININGS[PASITO_CLUB_TRAININGS.length - 1]
  return (
    <main className={marketingStyles.page}>
      <nav style={{ borderBottom: '1px solid #efece6', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: 'min(100%, 1264px)', minHeight: '68px', margin: '0 auto', padding: '0 32px' }}>
          <Link href="/club" style={{ display: 'inline-flex' }}>
            <Image src="/brand/logo-green.svg" alt="Pasito" width={104} height={25} />
          </Link>
        </div>
      </nav>

      <article style={{ maxWidth: '780px', margin: '0 auto', padding: '64px 24px 120px' }}>
        <p style={{ color: '#006d42', fontSize: '12px', fontWeight: 650, letterSpacing: '.6px', textTransform: 'uppercase' }}>
          Bases y condiciones
        </p>
        <h1 style={{ marginTop: '14px', fontFamily: 'var(--font-bricolage), system-ui, sans-serif', fontSize: '44px', fontWeight: 800, lineHeight: '48px', letterSpacing: '-1.4px' }}>
          Pasito Club · Temporada 2026
        </h1>
        <p style={{ marginTop: '14px', color: '#7c7c65', fontSize: '15px' }}>Versión vigente: 6 de octubre de 2026</p>

        <Section title="1. Qué es Pasito Club">
          <p style={p}>
            Pasito Club es un ciclo de {PASITO_CLUB_TRAININGS.length} encuentros de entrenamiento grupal, los miércoles a las{' '}
            {PASITO_CLUB_EVENT.timeLabel}, del {first.longLabel.toLowerCase()} al {last.longLabel.toLowerCase()} de 2026, en{' '}
            {PASITO_CLUB_EVENT.venueLabel}. Los entrenamientos son guiados por Linck Running Team y están pensados para todos
            los niveles, incluyendo personas que nunca corrieron.
          </p>
          <p style={p}>
            Algunos encuentros incluyen una activación con marcas del club. El ciclo cierra con la {PASITO_CLUB_RACE.name}, el{' '}
            {PASITO_CLUB_RACE.longLabel.toLowerCase()}, con distancias de 3K y 5K.
          </p>
        </Section>

        <Section title="2. Entradas y cupos">
          <p style={p}>
            Cada entrada es válida para un encuentro en la fecha elegida al momento de la compra. Cada fecha tiene un cupo
            de {PASITO_CLUB_EVENT.capacityPerDate} personas y las entradas se venden por orden de llegada hasta agotarlo.
            Los packs de {PASITO_CLUB_RACE_MIN_PACK} encuentros o más incluyen una entrada a la {PASITO_CLUB_RACE.name} con kit de corredor.
          </p>
          <p style={p}>
            El pago se procesa mediante Rebill. Al confirmarse, recibís por email un código QR por cada fecha. Cada QR es
            personal, se valida una sola vez y solo para su fecha.
          </p>
        </Section>

        <Section title="3. Cambios y devoluciones">
          <p style={p}>
            Las entradas no son reembolsables. Si no podés asistir, escribinos a soporte@pasito.app con al menos 48 horas
            de anticipación y vemos si es posible pasarla a otra fecha con cupo disponible o transferirla a otra persona.
          </p>
          <p style={p}>
            Si un encuentro se suspende por clima o fuerza mayor, se reprograma o se ofrece el reembolso de esa fecha.
          </p>
        </Section>

        <Section title="4. Participación y salud">
          <p style={p}>
            Para participar tenés que ser mayor de 18 años. La actividad física implica riesgos: si tenés alguna condición
            de salud, consultá con tu médico antes de empezar. Participás bajo tu propia responsabilidad y con tu propia
            cobertura de salud.
          </p>
        </Section>

        <Section title="5. Datos de contacto y grupo de WhatsApp">
          <p style={p}>
            Usamos tu email para enviarte las entradas y tu número de WhatsApp para sumarte al grupo de Pasito Club, donde
            compartimos la información de cada encuentro. Podés salir del grupo cuando quieras. No compartimos tus datos con
            terceros para fines comerciales.
          </p>
        </Section>

        <Section title="6. Uso de imagen">
          <p style={p}>
            Los encuentros se fotografían y filman para documentar el club. Al participar, aceptás que tu imagen pueda
            aparecer en contenido de Pasito y de las marcas del club. Si preferís no aparecer, avisale al equipo en el
            encuentro.
          </p>
        </Section>
      </article>
    </main>
  )
}
