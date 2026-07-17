import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Coffee,
  ExternalLink,
  Footprints,
  HeartPulse,
  MapPin,
  Music2,
  Sparkles,
} from 'lucide-react'

import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import marketingStyles from '../marketing.module.css'
import styles from './tomate.module.css'
import { TicketCheckout } from './TicketCheckout'
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=TOMATE+Estaci%C3%B3n+de+Sabores+Rosedal+de+Palermo'

const TICKETS = [
  {
    eyebrow: 'Primeras 100',
    price: '$25.000',
    note: 'El mejor precio para quienes llegan primero.',
    tone: 'lime',
  },
  {
    eyebrow: 'Siguientes 100',
    price: '$35.000',
    note: 'Segunda tanda, hasta completar el cupo.',
    tone: 'pink',
  },
  {
    eyebrow: 'Precio final',
    price: '$45.000',
    note: 'Última tanda hasta agotar entradas.',
    tone: 'white',
  },
] as const

const SCHEDULE = [
  { time: '11:00 - 12:30', title: 'Caminata por el Rosedal', icon: Footprints },
  { time: '12:30 - 12:40', title: 'Stretch post caminata', icon: HeartPulse },
  { time: '12:40 - 14:00', title: 'Yoga, charlas y experiencias', icon: Sparkles },
  {
    time: '14:00 - 15:00',
    title: 'Fogón con Tato Arzune',
    detail: 'Canciones de fogón · Set acústico',
    href: 'https://www.instagram.com/tatoarzune/',
    icon: Coffee,
  },
  { time: '15:00 - 16:30', title: 'DJ set', icon: Music2 },
]

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'www.pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`
  const title = 'Pasito Walking Club x TOMATE - 26 de julio'
  const description = '10.000 pasos, brunch, bienestar y música en el Rosedal de Palermo. Entradas desde $25.000.'

  return {
    title,
    description,
    alternates: { canonical: `${origin}/evento-pasito` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${origin}/evento-pasito`,
      locale: 'es_AR',
      images: [
        {
          url: `${origin}/evento-pasito/og.png`,
          width: 1536,
          height: 1024,
          alt: 'Pasito Walking Club x TOMATE, domingo 26 de julio en el Rosedal de Palermo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${origin}/evento-pasito/og.png`],
    },
  }
}

function BuyButton({ className = '', label = 'Comprar entrada' }: { className?: string; label?: string }) {
  return (
    <a
      className={`${styles.buyButton} ${className}`}
      href="#comprar"
    >
      {label}
      <ArrowRight size={19} aria-hidden="true" />
    </a>
  )
}

export default function TomateEventPage() {
  return (
    <main className={`${marketingStyles.page} ${styles.page}`} data-marketing-page>
      <MarketingMotion />

      <nav className={styles.navbar} aria-label="Navegación del evento">
        <div className={styles.navInner}>
          <Link href="/" className={styles.logoLink} aria-label="Pasito, inicio">
            <Image src="/brand/logo-green.svg" alt="Pasito" width={104} height={25} priority />
          </Link>
          <div className={styles.navLinks}>
            <a href="#experiencia">Experiencia</a>
            <a href="#agenda">Agenda</a>
            <a href="#lugar">Lugar</a>
          </div>
          <BuyButton className={styles.navBuy} />
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Pasito Walking Club <span aria-hidden="true">×</span> TOMATE</p>
            <h1>10.000 pasos y un brunch <span>a cielo abierto.</span></h1>
            <p className={styles.heroLead}>El primer encuentro presencial de Pasito: caminata, bienestar, comida, música y una tarde entera para compartir.</p>

            <div className={styles.heroFacts} aria-label="Datos principales del evento">
              <div>
                <CalendarDays size={19} aria-hidden="true" />
                <span><strong>Domingo 26 de julio</strong><small>2026</small></span>
              </div>
              <div>
                <Clock3 size={19} aria-hidden="true" />
                <span><strong>11:00 a 16:30</strong><small>Una tarde completa</small></span>
              </div>
              <div>
                <MapPin size={19} aria-hidden="true" />
                <span><strong>Rosedal de Palermo</strong><small>TOMATE</small></span>
              </div>
            </div>

            <div className={styles.heroActions}>
              <BuyButton label="Comprar desde $25.000" />
              <a className={styles.secondaryButton} href="#agenda">Ver agenda</a>
            </div>
          </div>

          <div className={styles.heroVisual} data-hero-tilt>
            <div className={styles.photoFrame}>
              <Image
                className={styles.venuePhoto}
                src="/evento-pasito/tomate-rosedal.webp"
                alt="TOMATE Estación de Sabores en el Rosedal de Palermo"
                width={724}
                height={910}
                sizes="(max-width: 760px) 88vw, 460px"
                priority
              />
            </div>
            <Image className={styles.paloma} src="/brand/paloma.png" alt="" width={423} height={430} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.heroTicker} aria-label="Resumen del evento">
          <span>Caminata</span><i aria-hidden="true" />
          <span>Brunch</span><i aria-hidden="true" />
          <span>Yoga</span><i aria-hidden="true" />
          <span>Música</span><i aria-hidden="true" />
          <span>Comunidad</span>
        </div>
      </header>

      <section className={styles.ticketsSection} id="entradas">
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Entradas por tandas</p>
              <h2>Cuanto antes venís,<br /><span>menos pagás.</span></h2>
            </div>
            <p>Hay cupos limitados y el precio sube cuando se agota cada tanda. Todas las entradas dan acceso a la experiencia completa.</p>
          </div>

          <div className={styles.ticketGrid}>
            {TICKETS.map((ticket, index) => (
              <article className={`${styles.ticketCard} ${styles[`ticket${ticket.tone}`]}`} key={ticket.eyebrow}>
                <div className={styles.ticketTop}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{ticket.eyebrow}</p>
                </div>
                <strong className={styles.ticketPrice}>{ticket.price}</strong>
                <p className={styles.ticketNote}>{ticket.note}</p>
                <BuyButton className={styles.ticketButton} label="Quiero mi entrada" />
              </article>
            ))}
          </div>
          <p className={styles.ticketFinePrint}>Las tandas avanzan automáticamente al agotarse. Entradas sujetas a disponibilidad.</p>
        </div>
      </section>

      <TicketCheckout />

      <section className={styles.experienceSection} id="experiencia">
        <div className={styles.container}>
          <p className={`${styles.overline} ${styles.overlineLight}`}>Una tarde para salir de la pantalla</p>
          <div className={styles.experienceHeading}>
            <h2>Primero nos movemos.<br /><span>Después pasa todo lo demás.</span></h2>
            <p>No hace falta entrenar ni competir. Venís a caminar a tu ritmo, compartir la mesa y vivir el Rosedal de otra manera.</p>
          </div>

          <div className={styles.experienceGrid}>
            <article>
              <Footprints size={27} aria-hidden="true" />
              <span>01</span>
              <h3>10.000 pasos</h3>
              <p>Una caminata grupal por el Rosedal para arrancar el día en movimiento.</p>
            </article>
            <article>
              <HeartPulse size={27} aria-hidden="true" />
              <span>02</span>
              <h3>Bienestar real</h3>
              <p>Stretch, yoga y charlas para bajar un cambio y volver al cuerpo.</p>
            </article>
            <article>
              <Coffee size={27} aria-hidden="true" />
              <span>03</span>
              <h3>Brunch buffet</h3>
              <p>Un brunch en formato buffet para compartir en TOMATE, en pleno corazón verde de Palermo.</p>
            </article>
            <article>
              <Music2 size={27} aria-hidden="true" />
              <span>04</span>
              <h3>Música hasta la tarde</h3>
              <p>Fogón acústico y canciones en vivo con Tato Arzune, antes del DJ set.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.scheduleSection} id="agenda">
        <div className={`${styles.container} ${styles.scheduleLayout}`}>
          <div className={styles.scheduleIntro}>
            <p className={styles.overline}>Domingo 26 de julio</p>
            <h2>De la caminata<br /><span>al DJ set.</span></h2>
            <p>Un plan completo, sin apuro y en un solo lugar.</p>
          </div>

          <ol className={styles.timeline}>
            {SCHEDULE.map(({ time, title, detail, href, icon: Icon }, index) => (
              <li key={time}>
                <span className={styles.timelineIcon}><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <time>{time}</time>
                  <h3>{title}</h3>
                  {detail && href && (
                    <a className={styles.timelineArtist} href={href} target="_blank" rel="noopener noreferrer">
                      {detail} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <span className={styles.timelineNumber}>{String(index + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.locationSection} id="lugar">
        <div className={`${styles.container} ${styles.locationLayout}`}>
          <div className={styles.locationPhoto}>
            <Image
              src="/evento-pasito/tomate-rosedal.webp"
              alt="Entrada a TOMATE Estación de Sabores"
              width={724}
              height={910}
              sizes="(max-width: 760px) 92vw, 540px"
            />
            <span>Nos vemos acá</span>
          </div>
          <div className={styles.locationCopy}>
            <p className={styles.overline}>El lugar</p>
            <h2>TOMATE,<br /><span>Rosedal de Palermo.</span></h2>
            <p>TOMATE Estación de Sabores va a ser nuestro punto de encuentro: verde, aire libre y espacio para quedarnos toda la tarde.</p>
            <div className={styles.locationDetails}>
              <MapPin size={22} aria-hidden="true" />
              <div>
                <strong>Rosedal de Palermo, CABA</strong>
                <span>TOMATE Estación de Sabores</span>
              </div>
            </div>
            <a className={styles.mapLink} href={MAP_URL} target="_blank" rel="noopener noreferrer">
              Abrir en Google Maps <ExternalLink size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.finalOrb} aria-hidden="true" />
        <Image className={styles.finalPaloma} src="/brand/paloma.png" alt="" width={423} height={430} aria-hidden="true" />
        <div className={styles.finalInner}>
          <p className={`${styles.overline} ${styles.overlineLight}`}>Cupos limitados</p>
          <h2>Nos vemos<br />en el Rosedal.</h2>
          <p>Domingo 26 de julio, de 11:00 a 16:30. Entradas desde $25.000.</p>
          <BuyButton label="Comprar mi entrada" />
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" aria-label="Pasito, inicio">
          <Image src="/brand/logo-white.svg" alt="Pasito" width={96} height={23} />
        </Link>
        <p>Pasito Walking Club × TOMATE · 2026</p>
        <nav aria-label="Enlaces legales">
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
      </footer>

      <div className={styles.mobileBuyBar}>
        <span><small>Entradas desde</small><strong>$25.000</strong></span>
        <BuyButton label="Comprar" />
      </div>
    </main>
  )
}
