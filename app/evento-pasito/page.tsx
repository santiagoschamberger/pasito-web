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
  Gift,
  HeartPulse,
  MapPin,
  Music2,
  Sparkles,
  Utensils,
} from 'lucide-react'

import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import { TOMATE_TICKET_BONUSES, tomateMoney } from '@/lib/tomate-event'
import marketingStyles from '../marketing.module.css'
import styles from './tomate.module.css'
import { TicketCheckout } from './TicketCheckout'
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=TOMATE+Estaci%C3%B3n+de+Sabores+Rosedal+de+Palermo'

const SCHEDULE = [
  {
    time: '10:30 - 11:00',
    title: 'Recepción en TOMATE',
    detail: 'Llegada, acreditación y encuentro del grupo.',
    icon: Coffee,
  },
  {
    time: '11:00 - 12:10',
    title: 'Caminata liderada por LINCK Running Team',
    detail: 'Una caminata grupal por el Rosedal para arrancar el día en movimiento.',
    icon: Footprints,
  },
  {
    time: '12:10 - 12:20',
    title: 'Stretch post caminata',
    detail: 'Un momento para elongar, respirar y volver al cuerpo.',
    icon: HeartPulse,
  },
  {
    time: '12:20 - 13:00',
    title: 'Yoga, charlas y experiencias',
    detail: 'Un espacio de bienestar para bajar un cambio.',
    icon: Sparkles,
  },
  {
    time: '13:00 - 14:00',
    title: 'Almuerzo buffet en TOMATE',
    detail: 'Incluido con tu entrada.',
    icon: Utensils,
  },
  {
    time: '14:00 - 15:00',
    title: 'Música en el fogón con Tato Arzune',
    detail: 'Set acústico y canciones en vivo.',
    href: 'https://www.instagram.com/tatoarzune/',
    icon: Music2,
  },
  {
    time: '15:00 - 16:30',
    title: 'DJ set',
    detail: 'Música para cerrar la tarde juntos.',
    icon: Music2,
  },
]

type Sponsor = {
  name: string
  logo?: string
  href?: string
}

// Reemplazá cada espacio con el nombre, la ruta del logo y, si corresponde, su sitio web.
const SPONSORS: Sponsor[] = [
  { name: 'Sponsor 01' },
  { name: 'Sponsor 02' },
  { name: 'Sponsor 03' },
  { name: 'Sponsor 04' },
  { name: 'Sponsor 05' },
  { name: 'Sponsor 06' },
  { name: 'Sponsor 07' },
  { name: 'Sponsor 08' },
  { name: 'Sponsor 09' },
  { name: 'Sponsor 10' },
  { name: 'Sponsor 11' },
  { name: 'Sponsor 12' },
  { name: 'Sponsor 13' },
  { name: 'Sponsor 14' },
  { name: 'Sponsor 15' },
]

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'www.pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`
  const title = 'Pasito Walking Club x TOMATE - 26 de julio'
  const description = '10.000 pasos, almuerzo buffet, bienestar y música en el Rosedal de Palermo. Entradas desde $35.000.'

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

function SponsorsSection() {
  return (
    <section className={styles.sponsorsSection} id="sponsors">
      <div className={styles.container}>
        <div className={styles.sponsorsHeading}>
          <p className={styles.overline}>Marcas que caminan con nosotros</p>
          <h2>Nos acompañan<br /><span>en cada paso.</span></h2>
          <p>Muy pronto vas a conocer a todas las marcas que hacen posible este encuentro.</p>
        </div>

        <ul className={styles.sponsorGrid} aria-label="Sponsors del evento">
          {SPONSORS.map((sponsor, index) => {
            const logo = sponsor.logo ? (
              <Image
                src={sponsor.logo}
                alt={sponsor.name}
                width={180}
                height={72}
                sizes="(max-width: 640px) 25vw, (max-width: 860px) 24vw, 180px"
              />
            ) : (
              <span className={styles.sponsorPlaceholder} aria-hidden="true">
                <small>Logo</small>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
              </span>
            )

            return (
              <li
                className={!sponsor.logo ? styles.sponsorSlotEmpty : undefined}
                key={sponsor.name}
                aria-label={!sponsor.logo ? `Espacio para sponsor ${index + 1}` : undefined}
              >
                {sponsor.href ? (
                  <a href={sponsor.href} target="_blank" rel="noopener noreferrer" aria-label={`Visitar ${sponsor.name}`}>
                    {logo}
                  </a>
                ) : logo}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default function TomateEventPage() {
  return (
    <main className={`${marketingStyles.page} ${styles.page}`} data-marketing-page>
      <MarketingMotion />

      <nav className={styles.navbar} aria-label="Navegación del evento">
        <div className={styles.navInner}>
          <Link href="/" className={styles.logoLink} aria-label="Pasito, inicio" prefetch={false}>
            <Image src="/brand/logo-green.svg" alt="Pasito" width={104} height={25} priority />
          </Link>
          <div className={styles.navLinks}>
            <a href="#agenda">Agenda</a>
            <a href="#entradas">Entradas</a>
            <a href="#lugar">Lugar</a>
            <a href="#sponsors">Sponsors</a>
          </div>
          <BuyButton className={styles.navBuy} />
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Pasito Walking Club <span aria-hidden="true">×</span> TOMATE</p>
            <h1>10.000 pasos y un almuerzo <span>a cielo abierto.</span></h1>
            <p className={styles.heroLead}>El primer encuentro presencial de Pasito: caminata, bienestar, almuerzo buffet, música y un día para compartir.</p>

            <div className={styles.heroFacts} aria-label="Datos principales del evento">
              <div>
                <CalendarDays size={19} aria-hidden="true" />
                <span><strong>Domingo 26 de julio</strong><small>2026</small></span>
              </div>
              <div>
                <Clock3 size={19} aria-hidden="true" />
                <span><strong>10:30 a 16:30</strong><small>Un día completo</small></span>
              </div>
              <div>
                <MapPin size={19} aria-hidden="true" />
                <span><strong>Rosedal de Palermo</strong><small>TOMATE</small></span>
              </div>
            </div>

            <div className={styles.heroActions}>
              <a className={styles.secondaryButton} href="#agenda">Ver agenda</a>
            </div>
          </div>

          <div className={styles.heroVisual} data-hero-tilt>
            <div className={styles.photoFrame}>
              <picture>
                <source
                  media="(max-width: 640px)"
                  srcSet="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                />
                <Image
                  className={styles.venuePhoto}
                  src="/evento-pasito/tomate-rosedal.webp"
                  alt="TOMATE Estación de Sabores en el Rosedal de Palermo"
                  width={724}
                  height={910}
                  sizes="(max-width: 760px) 88vw, 460px"
                  loading="eager"
                />
              </picture>
            </div>
            <Image className={styles.paloma} src="/brand/paloma.png" alt="" width={423} height={430} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.heroTicker} aria-label="Resumen del evento">
          <span>Caminata</span><i aria-hidden="true" />
          <span>Almuerzo</span><i aria-hidden="true" />
          <span>Yoga</span><i aria-hidden="true" />
          <span>Música</span><i aria-hidden="true" />
          <span>Comunidad</span>
        </div>
      </header>

      <section className={styles.scheduleSection} id="agenda">
        <div className={`${styles.container} ${styles.scheduleLayout}`}>
          <div className={styles.scheduleIntro}>
            <p className={styles.overline}>Domingo 26 de julio</p>
            <h2>De la caminata<br /><span>al DJ set.</span></h2>
            <p>Primero nos movemos. Después compartimos el almuerzo, las experiencias y la música, sin apuro y en un solo lugar.</p>
          </div>

          <ol className={styles.timeline}>
            {SCHEDULE.map(({ time, title, detail, href, icon: Icon }, index) => (
              <li key={time}>
                <span className={styles.timelineIcon}><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <time>{time}</time>
                  <h3>{title}</h3>
                  {href ? (
                    <a className={styles.timelineArtist} href={href} target="_blank" rel="noopener noreferrer">
                      {detail} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : detail ? <p className={styles.timelineDetail}>{detail}</p> : null}
                </div>
                <span className={styles.timelineNumber}>{String(index + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SponsorsSection />

      <section className={styles.ticketsSection} id="entradas">
        <div className={`${styles.container} ${styles.ticketLayout}`}>
          <div className={styles.ticketCopy}>
            <p className={styles.overline}>Cupos limitados</p>
            <h2>Tu entrada<br /><span>incluye todo.</span></h2>
            <p>Caminata, stretch, yoga, charlas y experiencias, almuerzo buffet en TOMATE, música en el fogón y DJ set.</p>
          </div>
          <div className={styles.priceCard}>
            <span>Precios y Pasitos de regalo</span>
            <div className={styles.ticketBonusList}>
              {TOMATE_TICKET_BONUSES.map((tier) => (
                <div key={tier.position}>
                  <span>
                    <small>{tier.label}</small>
                    <strong>{tomateMoney(tier.unitPrice)}</strong>
                  </span>
                  <p><Gift size={17} aria-hidden="true" /> +{tier.pasitos} Pasitos</p>
                </div>
              ))}
            </div>
            <p>Los Pasitos que ves junto a cada precio son un regalo por entrada: los acreditamos en tu cuenta dentro de la app Pasito para que los uses donde quieras.</p>
            <BuyButton label="Comprar entrada" />
          </div>
        </div>
      </section>

      <TicketCheckout />

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

      <footer className={styles.footer}>
        <Link href="/" aria-label="Pasito, inicio" prefetch={false}>
          <Image src="/brand/logo-white.svg" alt="Pasito" width={96} height={23} />
        </Link>
        <p>Pasito Walking Club × TOMATE · 2026</p>
        <nav aria-label="Enlaces legales">
          <Link href="/terminos" prefetch={false}>Términos</Link>
          <Link href="/privacidad" prefetch={false}>Privacidad</Link>
          <Link href="/contacto" prefetch={false}>Contacto</Link>
        </nav>
      </footer>

      <div className={styles.mobileBuyBar}>
        <span><small>Entradas desde</small><strong>$35.000</strong></span>
        <BuyButton label="Comprar entrada" />
      </div>
    </main>
  )
}
