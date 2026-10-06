import type { Metadata, Viewport } from 'next'
import { CalendarDays, Clock3, MapPin, Music2, Sparkles, Trophy, Users } from 'lucide-react'

import { MarketingNav } from '@/components/marketing/Marketing'
import {
  PASITO_CLUB_EVENT,
  PASITO_CLUB_RACE,
  PASITO_CLUB_RACE_MIN_PACK,
  PASITO_CLUB_TRAININGS,
  pasitoClubMoney,
  pasitoClubPacks,
} from '@/lib/pasito-club-event'
import { pasitoClubMockMode } from '@/lib/pasito-club-server'
import marketingStyles from '../marketing.module.css'
import { PasitoClubCheckout } from './PasitoClubCheckout'
import styles from './club.module.css'

const TITLE = 'Pasito Club — Entrenar es un planazo'
const DESCRIPTION = 'De caminar tus primeros pasos a correr tus primeros 3K. 8 miércoles, 200 cupos por fecha y la Carrera Pasito Club de cierre. Buenos Aires, octubre a diciembre.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pasito.app'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.pasito.app/club' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'es_AR',
    images: [{ url: '/pasito-club/og.png', width: 1200, height: 630, alt: 'Pasito Club' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#00402e',
}

const STICKERS = [
  { name: 'mate', width: 274, height: 360 },
  { name: 'zapas', width: 360, height: 344 },
  { name: 'botella', width: 297, height: 360 },
  { name: 'gorra', width: 360, height: 289 },
] as const

const SPONSORS = [
  { name: 'Heineken 0.0', file: 'heineken' },
  { name: 'Red Bull', file: 'red-bull' },
  { name: 'Día', file: 'dia' },
  { name: 'Kay', file: 'kay' },
  { name: 'Diagnóstico Maipú', file: 'diagnostico-maipu' },
  { name: 'VITS', file: 'vits' },
  { name: 'bnb · Benevia Natural Brands', file: 'bnb' },
  { name: 'Cósmico', file: 'cosmico' },
] as const

const JOURNEY = [
  { month: 'Mes 1', quote: '“No soy runner”', text: 'Arrancamos caminando. Nadie te apura.' },
  { month: 'Mes 2', quote: '“No tengo miedo”', text: 'Trotes cortos, mucha onda y desafíos chiquitos.' },
  { month: 'Mes 3', quote: '“Corrí mis primeros 3K”', text: 'Cerramos con la Carrera Pasito Club.' },
] as const

const FAQ = [
  {
    q: '¿Tengo que saber correr?',
    a: 'Para nada. El club es para los que todavía no se animan. Arrancamos caminando y vamos sumando de a poquito, con entrenadores de Linck Running Team.',
  },
  {
    q: '¿Qué incluye cada entrada?',
    a: 'Cada entrada es un miércoles de entrenamiento. Elegís tus fechas al comprar y te llega un QR por cada una. Si tu fecha tiene after, el after está incluido.',
  },
  {
    q: '¿Cómo entro a la Carrera Pasito Club?',
    a: `Viene incluida en los packs de ${PASITO_CLUB_RACE_MIN_PACK} encuentros o más, con kit de corredor. Corrés 3K o 5K, como prefieras.`,
  },
  {
    q: '¿Cómo me entero de todo?',
    a: 'Con el WhatsApp que nos dejes al comprar te sumamos al grupo de Pasito Club. Ahí pasamos la info de cada encuentro.',
  },
  {
    q: '¿Qué llevo?',
    a: 'Ropa cómoda, zapatillas y agua. Las ganas las ponemos entre todos.',
  },
] as const

const ribbon = Array.from({ length: 6 }, () => 'CAMINANDO PASAN COSAS LINDAS')

export default function PasitoClubPage() {
  const packs = pasitoClubPacks()
  const fromPrice = Math.min(...packs.map((pack) => Math.round(pack.price / pack.size)))
  const afterDates = PASITO_CLUB_TRAININGS.filter((training) => training.hasAfter)

  return (
    <div className={`${marketingStyles.page} ${styles.shell}`}>
      <MarketingNav contextualLink={{ href: '#entradas', label: 'Entradas' }} />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="club-title">
          <div className={styles.stickers} aria-hidden="true">
            {STICKERS.map((sticker) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={sticker.name}
                src={`/pasito-club/stickers/${sticker.name}.webp`}
                alt=""
                width={sticker.width}
                height={sticker.height}
                decoding="async"
                className={`${styles.sticker} ${styles[sticker.name]}`}
              />
            ))}
          </div>
          <div className={styles.heroInner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.heroLogo} src="/pasito-club/logo.svg" alt="Pasito Club" width={747} height={320} />
            <h1 id="club-title" className={styles.heroTitle}>
              Entrenar es un <span>planazo.</span>
            </h1>
            <p className={styles.heroLead}>
              De caminar tus primeros pasos a correr tus primeros 3K. Un miércoles por semana, con gente como vos y buena
              música. No hace falta ser runner.
            </p>
            <ul className={styles.heroFacts}>
              <li><CalendarDays aria-hidden="true" /> 8 miércoles · {PASITO_CLUB_EVENT.timeLabel}</li>
              <li><Users aria-hidden="true" /> {PASITO_CLUB_EVENT.capacityPerDate} cupos por fecha</li>
              <li><Trophy aria-hidden="true" /> Carrera final 3K o 5K</li>
            </ul>
            <div className={styles.heroActions}>
              <a className={styles.limeButton} href="#entradas">Quiero mi lugar</a>
              <a className={styles.ghostButton} href="#calendario">Ver fechas</a>
            </div>
            <p className={styles.heroPrice}>Desde {pasitoClubMoney(fromPrice)} por encuentro</p>
          </div>
        </section>

        <div className={styles.ribbon} aria-hidden="true">
          <div className={styles.ribbonTrack}>
            {[...ribbon, ...ribbon].map((text, index) => <span key={index}>{text}<i>✦</i></span>)}
          </div>
        </div>

        <section className={styles.about} aria-labelledby="about-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Qué es Pasito Club</p>
            <h2 id="about-title" className={styles.sectionTitle}>
              No tenés que ser runner para empezar a correr.
            </h2>
            <p className={styles.sectionLead}>
              Querés moverte pero el gym te aburre o arrancar un deporte te intimida. Querés conocer gente, pero no en una
              fiesta ni en una app de citas. Pasito Club es tu lugar: acá no importa cuánto corrés, importa que hayas venido.
            </p>
            <ol className={styles.journey}>
              {JOURNEY.map((step) => (
                <li key={step.month}>
                  <span>{step.month}</span>
                  <strong>{step.quote}</strong>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <ul className={styles.perks}>
              <li><Sparkles aria-hidden="true" /><span><strong>Entrenamientos guiados</strong> por Linck Running Team, para todos los niveles.</span></li>
              <li><Music2 aria-hidden="true" /><span><strong>Música y comunidad.</strong> Es el plan del miércoles.</span></li>
              <li><MapPin aria-hidden="true" /><span><strong>{PASITO_CLUB_EVENT.venueLabel}</strong>, miércoles a las {PASITO_CLUB_EVENT.timeLabel}.</span></li>
            </ul>
          </div>
        </section>

        <section className={styles.race} aria-labelledby="race-title">
          <div className={`${styles.container} ${styles.raceCard}`}>
            <div className={styles.raceCopy}>
              <p className={styles.raceEyebrow}>El gran final · {PASITO_CLUB_RACE.longLabel}</p>
              <h2 id="race-title" className={styles.raceTitle}>Carrera<br />Pasito Club</h2>
              <p className={styles.raceLead}>
                Todo el club cruzando la meta juntos. Corrés 3K o 5K, vos elegís. Con kit de corredor y el after final con las
                marcas del club.
              </p>
              <p className={styles.raceIncluded}>
                <Trophy aria-hidden="true" /> Incluida en los packs de {PASITO_CLUB_RACE_MIN_PACK} encuentros o más
              </p>
              <a className={styles.darkButton} href="#entradas">Quiero correrla</a>
            </div>
            <div className={styles.raceDistances} aria-hidden="true">
              <span>3K</span>
              <em>o</em>
              <span>5K</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.raceSticker} src="/pasito-club/stickers/zapas.webp" alt="" width={360} height={344} aria-hidden="true" />
          </div>
        </section>

        <section id="calendario" className={styles.calendar} aria-labelledby="calendar-title">
          <div className={styles.container}>
            <p className={styles.eyebrowLime}>Calendario</p>
            <h2 id="calendar-title" className={styles.sectionTitleLight}>8 miércoles. 3 afters.<br />1 carrera.</h2>
            <p className={styles.sectionLeadLight}>
              Todos los encuentros son a las {PASITO_CLUB_EVENT.timeLabel} en {PASITO_CLUB_EVENT.venueLabel}. {PASITO_CLUB_EVENT.capacityPerDate} cupos
              por fecha: cuando se llenan, se llenan.
            </p>
            <ol className={styles.calendarGrid}>
              {PASITO_CLUB_TRAININGS.map((training) => (
                <li key={training.position} className={training.hasAfter ? styles.calendarAfter : undefined}>
                  <span className={styles.calendarNumber}>#{training.number}</span>
                  <strong>{training.shortLabel}</strong>
                  <span className={styles.calendarTime}><Clock3 aria-hidden="true" /> {PASITO_CLUB_EVENT.timeLabel}</span>
                  {training.hasAfter && <span className={styles.afterTag}>After</span>}
                </li>
              ))}
              <li className={styles.calendarRace}>
                <span className={styles.calendarNumber}>Final</span>
                <strong>{PASITO_CLUB_RACE.shortLabel}</strong>
                <span className={styles.calendarTime}><Trophy aria-hidden="true" /> {PASITO_CLUB_RACE.name} · 3K o 5K</span>
                <span className={styles.afterTag}>After final</span>
              </li>
            </ol>
            <div className={styles.afterNote}>
              <strong>Una vez por mes, after.</strong>
              <p>
                Después de entrenar nos quedamos: las marcas del club arman un after con beneficios, desafíos y sampling. Este ciclo:{' '}
                {afterDates.map((training) => training.shortLabel).join(', ')} y la carrera del {PASITO_CLUB_RACE.shortLabel}.
                Si tenés entrada para esa fecha, estás adentro.
              </p>
            </div>
          </div>
        </section>

        <section id="entradas" className={styles.tickets} aria-labelledby="tickets-title">
          <div className={`${styles.container} ${styles.ticketsLayout}`}>
            <div className={styles.ticketsIntro}>
              <p className={styles.eyebrow}>Entradas</p>
              <h2 id="tickets-title" className={styles.sectionTitle}>Sumate al club.</h2>
              <p className={styles.sectionLead}>
                Cada entrada es un miércoles. Cuantos más encuentros, más barato te sale cada uno, y con{' '}
                {PASITO_CLUB_RACE_MIN_PACK} o más la carrera viene de regalo.
              </p>
              <ul className={styles.ticketPoints}>
                <li>Un QR por fecha, directo a tu email</li>
                <li>Te sumamos al grupo de WhatsApp del club</li>
                <li>Pago seguro con Rebill</li>
              </ul>
            </div>
            <PasitoClubCheckout mockCheckout={pasitoClubMockMode()} />
          </div>
        </section>

        <section className={styles.sponsors} aria-labelledby="sponsors-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Sponsors</p>
            <h2 id="sponsors-title" className={styles.sectionTitle}>Las marcas que ya se sumaron al club.</h2>
            <ul className={styles.sponsorGrid}>
              {SPONSORS.map((sponsor) => (
                <li key={sponsor.file}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/pasito-club/sponsors/${sponsor.file}.webp`} alt={sponsor.name} loading="lazy" decoding="async" />
                </li>
              ))}
            </ul>
            <div className={styles.coach}>
              <span>Entrenamientos a cargo de</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pasito-club/sponsors/linck.webp" alt="Linck Running Team" loading="lazy" decoding="async" />
            </div>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={`${styles.container} ${styles.faqLayout}`}>
            <h2 id="faq-title" className={styles.sectionTitle}>Preguntas<br />frecuentes</h2>
            <div className={styles.faqList}>
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.container}>
            <p className={styles.closingKicker}>No buscamos runners.</p>
            <h2 className={styles.closingTitle}>Los vamos a crear.</h2>
            <a className={styles.limeButton} href="#entradas">Quiero mi lugar</a>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.container}>
            <span>© 2026 Pasito · Pasito Club × Linck Running Team</span>
            <nav aria-label="Legales">
              <a href="/terminos/pasito-club">Bases y condiciones</a>
              <a href="/privacidad">Privacidad</a>
              <a href="/contacto">Contacto</a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  )
}
