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
import {
  TOMATE_TICKET_BONUSES,
  tomateMoney,
  tomateTicketTierIsSoldOut,
  type TicketInventoryTier,
} from '@/lib/tomate-event'
import { getTomateTicketInventory } from '@/lib/tomate-server'
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
    title: 'Yoga por Arizona + Kiwell — Outdoors',
    highlights: [
      { label: 'Charlas x Offline' },
      { label: 'Aprendiendo a Sentir y Pensar — CEO Sinergy' },
      {
        label: 'La incomodidad del cambio — Shirly Kohn',
        href: 'https://www.instagram.com/shirlykohn/',
      },
    ],
    icon: Sparkles,
  },
  {
    time: '13:00 - 14:00',
    title: 'Brunch buffet en TOMATE',
    detail: 'Incluido con tu entrada.',
    icon: Utensils,
  },
  {
    time: '14:00 - 15:00',
    title: 'Canciones de Fogón x Tato Arzune',
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

const EVENT_MENU = {
  food: [
    'Cuadrados de pastaflora',
    'Mini sándwich de queso brie, tomate y pesto',
    'Mini sándwich de queso brie y jamón cocido natural',
    'Shot de frutas',
    'Shot de yogurt con granola',
    'Pan de queso',
  ],
  drinks: [
    'Agua mineral',
    'Limonada, menta y jengibre',
    'Café de especialidad, Familia Cabrales (espresso y cortado)',
  ],
}

type Sponsor = {
  name: string
  logo: string
  cardClassName?: string
  logoClassName?: string
  unoptimized?: boolean
}

const SPONSORS: Sponsor[] = [
  {
    name: 'Decathlon',
    logo: '/evento-pasito/sponsors/decathlon.jpg',
    cardClassName: styles.sponsorCardDecathlon,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoDecathlon}`,
  },
  {
    name: 'Garmin',
    logo: '/evento-pasito/sponsors/garmin.png',
    cardClassName: styles.sponsorCardGarmin,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoGarmin}`,
  },
  {
    name: 'Aurum',
    logo: '/evento-pasito/sponsors/aurum.png',
    cardClassName: styles.sponsorCardAurum,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoAurum}`,
    unoptimized: true,
  },
  {
    name: 'Benevia Natural Brands',
    logo: '/evento-pasito/sponsors/benevia-natural-brands.png',
    cardClassName: styles.sponsorCardBenevia,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoBenevia}`,
  },
  {
    name: 'Flux, el plan joven de OSDE',
    logo: '/evento-pasito/sponsors/flux-osde.png',
    cardClassName: styles.sponsorCardFlux,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoFlux}`,
  },
  {
    name: 'TOMATE Estación de Sabores',
    logo: '/evento-pasito/sponsors/tomate.jpeg',
    logoClassName: styles.sponsorLogoSquare,
  },
  {
    name: 'Kiwell',
    logo: '/evento-pasito/sponsors/kiwell-green.png',
    cardClassName: styles.sponsorCardKiwell,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoKiwell}`,
  },
  {
    name: 'Somos PROTA',
    logo: '/evento-pasito/sponsors/somos-prota.jpeg',
    cardClassName: styles.sponsorCardProta,
    logoClassName: styles.sponsorLogoSquare,
  },
  {
    name: 'LINCK Running Team',
    logo: '/evento-pasito/sponsors/linck-running-team.png',
    cardClassName: styles.sponsorCardLinck,
    logoClassName: `${styles.sponsorLogoSquare} ${styles.sponsorLogoLinck}`,
  },
  {
    name: 'Offline',
    logo: '/evento-pasito/sponsors/offline.png',
    cardClassName: styles.sponsorCardOffline,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoOffline}`,
  },
  {
    name: 'BOSS',
    logo: '/evento-pasito/sponsors/boss.jpeg',
    cardClassName: styles.sponsorCardBoss,
    logoClassName: styles.sponsorLogoWide,
  },
  { name: 'Natier', logo: '/evento-pasito/sponsors/natier.webp' },
  {
    name: 'Matter',
    logo: '/evento-pasito/sponsors/matter.png',
    cardClassName: styles.sponsorCardMatter,
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'The Glow Factor',
    logo: '/evento-pasito/sponsors/the-glow-factor.jpeg',
    logoClassName: styles.sponsorLogoSquare,
  },
  {
    name: 'Awake',
    logo: '/evento-pasito/sponsors/awake.jpeg',
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'Arizona Health & Studio',
    logo: '/evento-pasito/sponsors/arizona.png',
    cardClassName: styles.sponsorCardArizona,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoArizona}`,
  },
  {
    name: 'Heineken 0.0',
    logo: '/evento-pasito/sponsors/heineken-00.png',
    logoClassName: styles.sponsorLogoHeineken,
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'www.pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`
  const title = 'Pasito Walking Club x TOMATE - 26 de julio'
  const currentTier = TOMATE_TICKET_BONUSES.find((tier) => !tier.soldOut) ?? TOMATE_TICKET_BONUSES[0]
  const description = `10.000 pasos, brunch buffet, bienestar y música en el Rosedal de Palermo. Entradas desde ${tomateMoney(currentTier.unitPrice)}.`

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

function SponsorsSection() {
  return (
    <section className={styles.sponsorsSection} id="sponsors">
      <div className={styles.container}>
        <div className={styles.sponsorsHeading}>
          <p className={styles.overline}>Marcas que caminan con nosotros</p>
          <h2>Nos acompañan<br /><span>en cada paso.</span></h2>
          <p>Estas son las marcas que nos acompañan y hacen posible este encuentro.</p>
        </div>

        <ul className={styles.sponsorGrid} aria-label="Sponsors del evento">
          {SPONSORS.map((sponsor) => (
            <li className={sponsor.cardClassName} key={sponsor.name}>
              <Image
                className={sponsor.logoClassName}
                src={sponsor.logo}
                alt={`Logo de ${sponsor.name}`}
                width={180}
                height={72}
                sizes="(max-width: 640px) 25vw, (max-width: 860px) 24vw, 180px"
                unoptimized={sponsor.unoptimized}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default async function TomateEventPage() {
  let ticketInventory: TicketInventoryTier[] = []
  try {
    ticketInventory = await getTomateTicketInventory()
  } catch (error) {
    console.error('[evento-pasito] No se pudo precargar el inventario:', error)
  }
  const currentPublicTier = TOMATE_TICKET_BONUSES.find(
    (tier) => !tomateTicketTierIsSoldOut(tier.position, ticketInventory),
  ) ?? TOMATE_TICKET_BONUSES[0]

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
            <h1>10.000 pasos y un brunch <span>a cielo abierto.</span></h1>
            <p className={styles.heroLead}>El primer encuentro presencial de Pasito: caminata, bienestar, brunch buffet, música y un día para compartir.</p>

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
          <span>Brunch</span><i aria-hidden="true" />
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
            <p>Primero nos movemos. Después compartimos el brunch, las experiencias y la música, sin apuro y en un solo lugar.</p>
          </div>

          <ol className={styles.timeline}>
            {SCHEDULE.map(({ time, title, detail, highlights, href, icon: Icon }, index) => (
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
                  {title === 'Brunch buffet en TOMATE' ? <EventMenu /> : null}
                  {highlights ? (
                    <ul className={styles.timelineHighlights}>
                      {highlights.map((highlight) => (
                        <li key={highlight.label}>
                          {highlight.href ? (
                            <a href={highlight.href} target="_blank" rel="noopener noreferrer">
                              {highlight.label} <ExternalLink size={12} aria-hidden="true" />
                            </a>
                          ) : <span>{highlight.label}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
            <p>Caminata, stretch, yoga, charlas y experiencias, brunch buffet en TOMATE, música en el fogón y DJ set.</p>
            <ul className={styles.ticketPerks} aria-label="Beneficios incluidos con la entrada">
              <li>
                <Gift size={19} aria-hidden="true" />
                <span><strong>Kit de productos incluido</strong><small>Lo recibís con tu entrada.</small></span>
              </li>
              <li>
                <Sparkles size={19} aria-hidden="true" />
                <span><strong>Sorteos con tu compra</strong><small>Participás por relojes Garmin y kits de productos Decathlon.</small></span>
              </li>
            </ul>
          </div>
          <div className={styles.priceCard}>
            <span>Precios y Pasitos de regalo</span>
            <div className={styles.ticketBonusList}>
              {TOMATE_TICKET_BONUSES.map((tier) => {
                const soldOut = tomateTicketTierIsSoldOut(tier.position, ticketInventory)
                return (
                  <div className={soldOut ? styles.ticketTierSoldOut : undefined} key={tier.position}>
                    <span>
                      <small>{tier.label}</small>
                      <strong>{tomateMoney(tier.unitPrice)}</strong>
                    </span>
                    {soldOut ? (
                      <p className={styles.soldOutBadge}>Agotada</p>
                    ) : (
                      <p><Gift size={17} aria-hidden="true" /> +{tier.pasitos} Pasitos</p>
                    )}
                  </div>
                )
              })}
            </div>
            <p>Los Pasitos que ves junto a cada precio son un regalo por entrada. Después de comprar, vas a poder indicar desde un link qué cuenta de Pasito recibe los de cada entrada.</p>
            <BuyButton label="Comprar entrada" />
          </div>
        </div>
      </section>

      <TicketCheckout initialTiers={ticketInventory} />

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
        <span><small>Entradas desde</small><strong>{tomateMoney(currentPublicTier.unitPrice)}</strong></span>
        <BuyButton label="Comprar entrada" />
      </div>
    </main>
  )
}
