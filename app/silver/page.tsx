import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Coffee,
  Footprints,
  Heart,
  MapPin,
  Utensils,
} from 'lucide-react'

import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import {
  SILVER_TICKET_TIERS,
  silverEventIsSoldOut,
  silverMoney,
  type TicketInventoryTier,
} from '@/lib/silver-event'
import { getSilverTicketInventory } from '@/lib/silver-server'
import marketingStyles from '../marketing.module.css'
import styles from './silver.module.css'
import { SilverTicketCheckout } from './SilverTicketCheckout'

const AUGUSTA_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Av.+Ernesto+Tornquist+6385+CABA'

const SCHEDULE = [
  {
    time: '09:30 - 10:00',
    title: 'Recepción y bienvenida',
    detail: 'Café y primer contacto en Augusta.',
    icon: Coffee,
  },
  {
    time: '10:00 - 11:00',
    title: 'Caminata activa',
    detail: 'Ritmo conversado, nadie queda atrás.',
    icon: Footprints,
  },
  {
    time: '11:00 - 11:30',
    title: 'Stretching y Relajación',
    detail: 'Elongación y recuperación post caminata.',
    icon: Heart,
  },
  {
    time: '11:30 - 12:00',
    title: 'Charla Medicina 3.0',
    detail: 'Longevidad, sueño, fuerza y nutrición.',
    icon: Heart,
  },
  {
    time: '12:00 - 13:00',
    title: 'Brunch en Augusta',
    detail: 'Buffet completo incluido con tu entrada.',
    icon: Utensils,
  },
]

type Sponsor = {
  name: string
  logo: string
  cardClassName?: string
  logoClassName?: string
}

const SPONSORS: Sponsor[] = [
  {
    name: 'Kiwell',
    logo: '/evento-pasito/sponsors/kiwell-green.png',
    cardClassName: styles.sponsorCardKiwell,
    logoClassName: `${styles.sponsorLogoWide} ${styles.sponsorLogoKiwell}`,
  },
  {
    name: 'exty',
    logo: '/silver/sponsors/exty.png',
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'Farmacity',
    logo: '/silver/sponsors/farmacity.png',
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'Under Armour',
    logo: '/silver/sponsors/under-armour.png',
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'Benevia Natural Brands',
    logo: '/evento-pasito/sponsors/benevia-natural-brands.png',
    logoClassName: styles.sponsorLogoWide,
  },
  {
    name: 'Nutren Senior',
    logo: '/silver/sponsors/nutren-senior.png',
    logoClassName: styles.sponsorLogoWide,
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'www.pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`
  const title = 'Silver Walks - Pasito × Kiwell'
  const description = 'Caminar, aprender y desayunar. Domingo 27 de septiembre en Augusta, Palermo. Entradas a $45.000.'
  const ogImage = `${origin}/silver/og.jpg`

  return {
    title,
    description,
    alternates: { canonical: `${origin}/silver` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${origin}/silver`,
      locale: 'es_AR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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

function SponsorsSection() {
  return (
    <section className={styles.sponsorsSection} id="sponsors">
      <div className={styles.container}>
        <div className={styles.sponsorsHeading}>
          <p className={styles.overline}>Marcas que caminan con nosotros</p>
          <h2>Nos acompañan<br /><span>en cada paso.</span></h2>
          <p>Marcas comprometidas con el bienestar y la vida activa.</p>
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
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default async function SilverWalksPage() {
  let ticketInventory: TicketInventoryTier[] = []
  try {
    ticketInventory = await getSilverTicketInventory()
  } catch (error) {
    console.error('[silver] No se pudo precargar el inventario:', error)
  }
  const eventSoldOut = silverEventIsSoldOut(ticketInventory)
  const currentPublicTier = SILVER_TICKET_TIERS[0]

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
            <a href="#lugar">Lugar</a>
            <a href="#entradas">Entradas</a>
          </div>
          <BuyButton className={styles.navBuy} label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroImage}>
          <Image
            src="/silver/hero.jpg"
            alt="Silver Walks - Pasito × Kiwell"
            fill
            priority
            sizes="100vw"
            className={styles.heroImg}
          />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Pasito Walking Club <span aria-hidden="true">×</span> Kiwell</p>
            <h1><span>Silver Walks.</span><br />Caminar. Aprender.<br />Desayunar.</h1>
            <p className={styles.heroLead}>El primer encuentro de bienestar para mayores de 45: caminata, charla de longevidad, brunch buffet y un día para compartir en Palermo.</p>

            <div className={styles.heroFacts} aria-label="Datos principales del evento">
              <div>
                <CalendarDays size={19} aria-hidden="true" />
                <span><strong>Domingo 27 de septiembre</strong><small>2026</small></span>
              </div>
              <div>
                <Clock size={19} aria-hidden="true" />
                <span><strong>09:30 a 13:00</strong><small>Encuentro matutino</small></span>
              </div>
              <div>
                <MapPin size={19} aria-hidden="true" />
                <span><strong>Augusta, Palermo</strong><small>CABA</small></span>
              </div>
            </div>

            <div className={styles.heroActions}>
              <BuyButton label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
              <a className={styles.secondaryButton} href="#agenda">Ver agenda</a>
            </div>
          </div>
        </div>

        <div className={styles.heroTicker} aria-label="Resumen del evento">
          <span>Caminata</span><i aria-hidden="true" />
          <span>Charla</span><i aria-hidden="true" />
          <span>Brunch</span><i aria-hidden="true" />
          <span>Bienestar</span><i aria-hidden="true" />
          <span>Comunidad</span>
        </div>
      </header>

      <section className={styles.scheduleSection} id="agenda">
        <div className={`${styles.container} ${styles.scheduleLayout}`}>
          <div className={styles.scheduleIntro}>
            <p className={styles.overline}>Domingo 27 de septiembre</p>
            <h2>Tres horas<br /><span>de estar bien.</span></h2>
            <p>Movimiento, conocimiento y sobremesa. Sin apuro, en un solo lugar.</p>
          </div>

          <ol className={styles.timeline}>
            {SCHEDULE.map(({ time, title, detail, icon: Icon }, index) => (
              <li key={time}>
                <span className={styles.timelineIcon}><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <time>{time}</time>
                  <h3>{title}</h3>
                  {detail && <p className={styles.timelineDetail}>{detail}</p>}
                </div>
                <span className={styles.timelineNumber}>{String(index + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.locationSection} id="lugar">
        <div className={`${styles.container} ${styles.locationLayout}`}>
          <div className={styles.locationCopy}>
            <p className={styles.overline}>El lugar</p>
            <h2>Augusta,<br /><span>Palermo.</span></h2>
            <p>Un espacio verde, al aire libre y con la comodidad de quedarnos toda la mañana. Brunch buffet incluido.</p>
            <div className={styles.locationDetails}>
              <MapPin size={22} aria-hidden="true" />
              <div>
                <strong>Av. Ernesto Tornquist 6385</strong>
                <span>Palermo, CABA</span>
              </div>
            </div>
            <a className={styles.mapLink} href={AUGUSTA_MAP_URL} target="_blank" rel="noopener noreferrer">
              Abrir en Google Maps <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.augustaGallery} aria-label="Fotos de Augusta">
        <div className={styles.galleryGrid}>
          <div className={styles.galleryItem}>
            <Image
              src="/silver/augusta/01.jpg"
              alt="Deck con vistas al campo de golf"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.galleryImage}
            />
          </div>
          <div className={styles.galleryItem}>
            <Image
              src="/silver/augusta/02.jpg"
              alt="Terrace al atardecer"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.galleryImage}
            />
          </div>
          <div className={styles.galleryItem}>
            <Image
              src="/silver/augusta/03.jpg"
              alt="Terraza con iluminación"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.galleryImage}
            />
          </div>
          <div className={styles.galleryItem}>
            <Image
              src="/silver/augusta/04-augusta-sign.jpg"
              alt="Entrada Augusta"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.galleryImage}
            />
          </div>
          <div className={styles.galleryItem}>
            <Image
              src="/silver/augusta/05.jpg"
              alt="Lounge al atardecer"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.galleryImage}
            />
          </div>
        </div>
      </section>

      <SponsorsSection />

      <section className={styles.ticketsSection} id="entradas">
        <div className={`${styles.container} ${styles.ticketLayout}`}>
          <div className={styles.ticketCopy}>
            <p className={styles.overline}>Cupos limitados</p>
            <h2>Tu entrada<br /><span>incluye todo.</span></h2>
            <p>Caminata guiada por Kiwell, charla de longevidad, brunch buffet completo en Augusta y kit de productos.</p>
            <div className={styles.priceDisplay}>
              <strong>{silverMoney(currentPublicTier.unitPrice)}</strong>
              <span>por persona</span>
            </div>
          </div>
        </div>
      </section>

      <SilverTicketCheckout initialTiers={ticketInventory} />

      <footer className={styles.footer}>
        <Link href="/" aria-label="Pasito, inicio" prefetch={false}>
          <Image src="/brand/logo-green.svg" alt="Pasito" width={96} height={23} />
        </Link>
        <p>Pasito Walking Club × Kiwell · Silver Walks · 2026</p>
        <nav aria-label="Enlaces legales">
          <Link href="/terminos" prefetch={false}>Términos</Link>
          <Link href="/privacidad" prefetch={false}>Privacidad</Link>
          <Link href="/contacto" prefetch={false}>Contacto</Link>
        </nav>
      </footer>

      <div className={styles.mobileBuyBar}>
        <span>
          <small>{eventSoldOut ? 'Entradas' : 'Entradas'}</small>
          <strong>{eventSoldOut ? 'SOLD OUT' : silverMoney(currentPublicTier.unitPrice)}</strong>
        </span>
        <BuyButton label={eventSoldOut ? 'SOLD OUT' : 'Comprar entrada'} soldOut={eventSoldOut} />
      </div>
    </main>
  )
}
