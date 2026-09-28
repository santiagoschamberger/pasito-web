import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
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
import {
  WALKING_CLUB_UY_TICKET_TIERS,
  walkingClubUyEventIsSoldOut,
  walkingClubUyMoney,
  walkingClubUyTicketTierIsSoldOut,
  type TicketInventoryTier,
} from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUyTicketInventory } from '@/lib/uruguay-walking-club-server'
import marketingStyles from '../marketing.module.css'
import styles from '../evento-pasito/tomate.module.css'
import { TicketCheckout } from './TicketCheckout'

const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Casa+Fauno+Parque+Rod%C3%B3+Montevideo'

const SCHEDULE = [
  {
    time: '10:30 - 11:00',
    title: 'Acreditación en Rambla Pdte. Wilson y Bulevar Artigas',
    detail: 'Encuentro del grupo, acreditación y encuentro del grupo.',
    icon: Footprints,
  },
  {
    time: '11:00 - 12:00',
    title: 'Caminata liderada por Fit Jeff',
    detail: 'Una caminata grupal por la rambla y Parque Rodó para empezar el día en movimiento.',
    icon: Footprints,
  },
  {
    time: '12:00 - 12:10',
    title: 'Stretch post caminata',
    detail: 'Elongamos todos juntos post caminata.',
    icon: HeartPulse,
  },
  {
    time: '12:10 - 12:30',
    title: 'Yoga x (estudio a confirmar)',
    detail: 'Un momento para respirar y volver al cuerpo.',
    icon: Sparkles,
  },
  {
    time: '12:30 - 13:30',
    title: 'Brunch en Casa Fauno',
    detail: 'Incluido con tu entrada.',
    icon: Utensils,
  },
  {
    time: '13:30 - 14:00',
    title: 'Juegos, premios y sorpresas',
    detail: 'Divertite con juegos, participá en sorteos y descubrí las sorpresas de nuestras marcas aliadas.',
    icon: Gift,
  },
  {
    time: '14:00 - 15:00',
    title: 'DJ set',
    detail: 'Música para terminar la tarde juntos.',
    icon: Music2,
  },
]

const EVENT_MENU = {
  food: [
    'Mini sándwich de queso y jamón cocido natural',
    'Mini sándwich de queso y tomate',
    'Mini sándwich olímpicos',
    'Mini tartaletas caprese',
    'Pan de queso',
    'Cuadrados de pastaflora',
    'Tartaletas de fruta',
    'Shot de yogurt con granola',
  ],
  drinks: [
    'Agua mineral',
    'Limonada, menta y jengibre',
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'www.pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`
  const title = 'Pasito Walking Club - Uruguay, 10 de octubre'
  const currentTier = WALKING_CLUB_UY_TICKET_TIERS.find((tier) => !tier.soldOut)
  const description = currentTier
    ? `10.000 pasos y un brunch a cielo abierto. El primer encuentro presencial de Pasito en Uruguay. Entradas desde ${walkingClubUyMoney(currentTier.unitPrice)}.`
    : '10.000 pasos y un brunch a cielo abierto. El primer encuentro presencial de Pasito en Uruguay. Entradas agotadas.'

  return {
    title,
    description,
    alternates: { canonical: `${origin}/walking-club-uy` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${origin}/walking-club-uy`,
      locale: 'es_UY',
      images: [
        {
          url: `${origin}/evento-pasito/og.png`,
          width: 1536,
          height: 1024,
          alt: 'Pasito Walking Club, sábado 10 de octubre en Casa Fauno, Parque Rodó',
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

function BuyButton({
  className = '',
  label = 'Comprar entrada',
  soldOut = false,
}: {
  className?: string
  label?: string
  soldOut?: boolean
}) {
  const buttonClassName = `${styles.buyButton} ${className}`

  if (soldOut) {
    return (
      <span className={buttonClassName} aria-disabled="true">
        {label}
      </span>
    )
  }

  return (
    <a
      className={buttonClassName}
      href="#comprar"
    >
      {label}
      <ArrowRight size={19} aria-hidden="true" />
    </a>
  )
}

function EventMenu() {
  return (
    <details className={styles.eventMenu}>
      <summary>Ver menú incluido</summary>
      <div className={styles.eventMenuGrid}>
        <div>
          <strong>Para comer</strong>
          <ul>
            {EVENT_MENU.food.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <strong>Bebidas</strong>
          <ul>
            {EVENT_MENU.drinks.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </details>
  )
}

export default async function WalkingClubUyPage() {
  let ticketInventory: TicketInventoryTier[] = []
  try {
    ticketInventory = await getWalkingClubUyTicketInventory()
  } catch (error) {
    console.error('[walking-club-uy] No se pudo precargar el inventario:', error)
  }
  const eventSoldOut = walkingClubUyEventIsSoldOut(ticketInventory)
  const currentPublicTier = WALKING_CLUB_UY_TICKET_TIERS.find(
    (tier) => !walkingClubUyTicketTierIsSoldOut(tier.position, ticketInventory),
  ) ?? WALKING_CLUB_UY_TICKET_TIERS.at(-1)!

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
          </div>
          <BuyButton className={styles.navBuy} label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Pasito Walking Club</p>
            <h1>10.000 pasos y un brunch <span>a cielo abierto.</span></h1>
            <p className={styles.heroLead}>El primer encuentro presencial de Pasito: caminata, bienestar, brunch, música y un día para compartir.</p>

            <div className={styles.heroFacts} aria-label="Datos principales del evento">
              <div>
                <CalendarDays size={19} aria-hidden="true" />
                <span><strong>Sábado 10 de octubre</strong><small>2026</small></span>
              </div>
              <div>
                <Clock3 size={19} aria-hidden="true" />
                <span><strong>10:30 a 15:00</strong><small>Un día completo</small></span>
              </div>
              <div>
                <MapPin size={19} aria-hidden="true" />
                <span><strong>Casa Fauno</strong><small>Parque Rodó</small></span>
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
                  src="/walking-club-uy/casa-fauno-fachada.webp"
                  alt="Casa Fauno, Parque Rodó"
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
          <span>Brunch</span><i aria-hidden="true" />
          <span>Yoga</span><i aria-hidden="true" />
          <span>Música</span><i aria-hidden="true" />
          <span>Comunidad</span>
        </div>
      </header>

      <section className={styles.scheduleSection} id="agenda">
        <div className={`${styles.container} ${styles.scheduleLayout}`}>
          <div className={styles.scheduleIntro}>
            <p className={styles.overline}>Sábado 10 de octubre</p>
            <h2>De la caminata<br /><span>al DJ set.</span></h2>
            <p>Primero nos movemos. Después compartimos el brunch, las experiencias y la música, sin apuro y en un solo lugar.</p>
          </div>

          <ol className={styles.timeline}>
            {SCHEDULE.map(({ time, title, detail, icon: Icon }, index) => (
              <li key={time}>
                <span className={styles.timelineIcon}><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <time>{time}</time>
                  <h3>{title}</h3>
                  {detail ? <p className={styles.timelineDetail}>{detail}</p> : null}
                  {title === 'Brunch en Casa Fauno' ? <EventMenu /> : null}
                </div>
                <span className={styles.timelineNumber}>{String(index + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.ticketsSection} id="entradas">
        <div className={`${styles.container} ${styles.ticketLayout}`}>
          <div className={styles.ticketCopy}>
            <p className={styles.overline}>Cupos limitados</p>
            <h2>Tu entrada<br /><span>incluye todo.</span></h2>
            <p>Caminata, stretch, yoga, charlas y experiencias, brunch en Casa Fauno, música y DJ set.</p>
            <ul className={styles.ticketPerks} aria-label="Beneficios incluidos con la entrada">
              <li>
                <Sparkles size={19} aria-hidden="true" />
                <span><strong>Sorteos con tu compra</strong><small>Participá por premios de marcas amigas.</small></span>
              </li>
            </ul>
          </div>
          <div className={styles.priceCard}>
            <span>Precios por tanda</span>
            <div className={styles.ticketBonusList}>
              {WALKING_CLUB_UY_TICKET_TIERS.map((tier) => {
                const soldOut = walkingClubUyTicketTierIsSoldOut(tier.position, ticketInventory)
                return (
                  <div className={soldOut ? styles.ticketTierSoldOut : undefined} key={tier.position}>
                    <span>
                      <small>{tier.label}</small>
                      <strong>{walkingClubUyMoney(tier.unitPrice)}</strong>
                    </span>
                    {soldOut ? (
                      <p className={styles.soldOutBadge}>Agotada</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <BuyButton label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
          </div>
        </div>
      </section>

      <TicketCheckout initialTiers={ticketInventory} />

      <section className={styles.locationSection} id="lugar">
        <div className={`${styles.container} ${styles.locationLayout}`}>
          <div className={styles.locationPhoto}>
            <Image
              src="/walking-club-uy/casa-fauno-fachada.webp"
              alt="Casa Fauno, Parque Rodó"
              width={724}
              height={910}
              sizes="(max-width: 760px) 92vw, 540px"
            />
            <span>Nos vemos acá</span>
          </div>
          <div className={styles.locationCopy}>
            <p className={styles.overline}>El lugar</p>
            <h2>Casa Fauno,<br /><span>Parque Rodó.</span></h2>
            <p>Casa Fauno va a ser nuestro punto de llegada: verde, aire libre y espacio para quedarnos toda la tarde.</p>
            <div className={styles.locationDetails}>
              <MapPin size={22} aria-hidden="true" />
              <div>
                <strong>Parque Rodó, Montevideo</strong>
                <span>Casa Fauno</span>
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
        <p>Pasito Walking Club · 2026</p>
        <nav aria-label="Enlaces legales">
          <Link href="/terminos" prefetch={false}>Términos</Link>
          <Link href="/privacidad" prefetch={false}>Privacidad</Link>
          <Link href="/contacto" prefetch={false}>Contacto</Link>
        </nav>
      </footer>

      <div className={styles.mobileBuyBar}>
        <span>
          <small>{eventSoldOut ? 'Entradas' : 'Entradas desde'}</small>
          <strong>{eventSoldOut ? 'SOLD OUT' : walkingClubUyMoney(currentPublicTier.unitPrice)}</strong>
        </span>
        <BuyButton label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
      </div>
    </main>
  )
}
