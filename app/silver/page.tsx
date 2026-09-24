import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Clock,
  MapPin,
  Footprints,
  Heart,
  Users,
  Check,
} from 'lucide-react'
import {
  SILVER_EVENT,
  SILVER_TICKET_TIERS,
  silverMoney,
} from '@/lib/silver-event'
import marketingStyles from '../marketing.module.css'
import styles from './silver.module.css'
import { SilverTicketCheckout } from './SilverTicketCheckout'
import { SilverQuestions } from './SilverQuestions'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}
export const metadata: Metadata = {
  title: 'Silver Walks by Nutren · Un buen momento para vos',
  description:
    'Una mañana para moverte, aprender y compartir. 17 de octubre, 09:30 a 13:00, Augusta, Palermo. Organizado por Pasito + Kiwell en colaboración.',
  alternates: { canonical: 'https://www.pasito.app/silver' },
  openGraph: {
    title: 'Silver Walks by Nutren',
    description:
      'El próximo paso es para vos. 17 de octubre · Augusta, Palermo.',
    url: 'https://www.pasito.app/silver',
    images: [
      {
        url: 'https://www.pasito.app/silver/opengraph-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Silver Walks by Nutren',
    images: ['https://www.pasito.app/silver/opengraph-image.png'],
  },
}
const schedule = [
  [
    '09:30',
    'Nos encontramos',
    'Recepción y bienvenida con un café en Augusta.',
  ],
  [
    '10:00',
    'Salimos a caminar',
    'Una caminata activa, a un ritmo que invita a conversar.',
  ],
  [
    '11:00',
    'Elongación y relajación',
    'Elongación y relajación después de movernos.',
  ],
  [
    '11:30',
    'Aprendemos sobre bienestar',
    'Charla Medicina 3.0: longevidad, sueño, fuerza y nutrición.',
  ],
  [
    '12:00',
    'Compartimos la mesa',
    'Brunch buffet en Augusta. La mejor forma de cerrar la mañana.',
  ],
]
const included = [
  'Caminata guiada por Kiwell',
  'Elongación y relajación',
  'Charla sobre longevidad y hábitos',
  'Brunch buffet en Augusta',
  'Kit de productos de las marcas',
]
function Buy({
  label = 'Quiero ser parte',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <a href="#comprar" className={`${styles.buyButton} ${className}`}>
      {label}
      <ArrowUpRight size={20} aria-hidden="true" />
    </a>
  )
}
export default function SilverWalksPage() {
  return (
    <main className={`${marketingStyles.page} ${styles.page}`}>
      <a href="#experiencia" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <div className={styles.announcement}>
        DOMINGO 17 DE OCTUBRE <span>·</span> AUGUSTA, PALERMO <span>·</span>{' '}
        UNA MAÑANA PARA VOS
      </div>
      <nav className={styles.navbar} aria-label="Navegación del evento">
        <div className={styles.navInner}>
          <Link
            href="/"
            className={styles.logoLink}
            aria-label="Pasito, inicio"
          >
            <Image
              src="/brand/logo-green.svg"
              alt="Pasito"
              width={103}
              height={25}
            />
          </Link>
          <span className={styles.navDivider} />
          <a href="#" className={styles.navEdition}>
            SILVER WALKS <span>VOL. 01</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#experiencia">La experiencia</a>
            <a href="#agenda">La agenda</a>
            <a href="#lugar">El lugar</a>
          </div>
          <Buy className={styles.navBuy} />
        </div>
      </nav>
      <div className={styles.rescheduleNotice}>
        <div className={styles.rescheduleContent}>
          <strong>Evento reprogramado</strong>
          <p>
            Silver Walks se reprogramó para el <strong>domingo 17 de octubre</strong> por lluvia.
            Las ventas de entradas están pausadas.
          </p>
        </div>
      </div>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>
            <span /> MOVERSE. CONECTAR. DISFRUTAR.
          </p>
          <div className={styles.eventBrand}>
            Silver Walks <span>by</span>
            <Image
              src="/silver/sponsors/nutren-real.svg"
              alt="Nutren"
              width={130}
              height={60}
              priority
            />
          </div>
          <h1>
            El próximo
            <br />
            paso es
            <br />
            <em>para vos.</em>
          </h1>
          <p className={styles.heroLead}>
            Un encuentro para personas de 40 años en adelante. Una caminata,
            herramientas para cuidarte y un brunch para disfrutar en buena
            compañía.
          </p>
          <div className={styles.heroActions}>
            <Buy />
            <a href="#agenda" className={styles.secondaryButton}>
              Conocé el plan <ArrowDown size={17} />
            </a>
          </div>
          <div className={styles.heroByline}>
            <span>Organizan en colaboración</span>
            <div className={styles.organizerLogos}>
              <Image
                src="/brand/logo-green.svg"
                alt="Pasito"
                width={74}
                height={22}
              />
              <span aria-hidden="true">+</span>
              <Image
                src="/evento-pasito/sponsors/kiwell-2025.png"
                alt="Kiwell"
                width={91}
                height={36}
              />
            </div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Image
            src="/silver/walk-photo.webp"
            alt="Personas compartiendo un momento de movimiento al aire libre"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 52vw"
            className={styles.heroImg}
          />
          <div className={styles.dateStamp}>
            <span>DOMINGO</span>
            <strong>17</strong>
            <span>OCTUBRE</span>
          </div>
          <div className={styles.photoCaption}>
            <span>
              Una caminata.
              <br />
              <strong>Buena compañía.</strong>
            </span>
            <Footprints size={32} strokeWidth={1.3} />
          </div>
        </div>
      </header>
      <div className={styles.factsBar}>
        <div>
          <CalendarDays size={23} />
          <span>
            <small>AGENDALO</small>
            <strong>17 de octubre</strong>
          </span>
        </div>
        <div>
          <Clock size={23} />
          <span>
            <small>SIN APURO</small>
            <strong>{SILVER_EVENT.timeLabel} h</strong>
          </span>
        </div>
        <div>
          <MapPin size={23} />
          <span>
            <small>NOS VEMOS EN</small>
            <strong>{SILVER_EVENT.venueLabel}</strong>
          </span>
        </div>
        <div>
          <Users size={23} />
          <span>
            <small>PENSADO PARA VOS</small>
            <strong>40 años en adelante</strong>
          </span>
        </div>
      </div>
      <section
        id="experiencia"
        className={`${styles.container} ${styles.experience}`}
      >
        <div>
          <p className={styles.overline}>
            01 / UNA NUEVA FORMA DE ENCONTRARNOS
          </p>
          <h2>
            Cuidarte hace bien.
            <br />
            <em>Compartirlo, también.</em>
          </h2>
        </div>
        <div className={styles.experienceCopy}>
          <p>
            Caminar al aire libre, aprender algo nuevo y compartir una charla. A
            veces, dedicarte una mañana es una buena manera de empezar.
          </p>
          <p>
            Silver Walks by Nutren reúne a personas de 40 años en adelante que
            quieren cuidar sus hábitos y mantenerse activas. Pasito y Kiwell
            organizan juntos un encuentro al mes, con tiempo para moverse,
            aprender y conocer gente.
          </p>
        </div>
        <div className={styles.pillars}>
          {[
            {
              icon: Footprints,
              n: '01',
              title: 'Moverte a tu ritmo',
              text: 'Una caminata para disfrutar el aire libre y reconectar con tu cuerpo.',
            },
            {
              icon: Heart,
              n: '02',
              title: 'Cuidar tus hábitos',
              text: 'Ideas y herramientas para llevar el bienestar a tu día a día.',
            },
            {
              icon: Users,
              n: '03',
              title: 'Conocer gente',
              text: 'Conversaciones nuevas, una mesa compartida y ganas de volver.',
            },
          ].map(({ icon: Icon, n, title, text }) => (
            <article key={n}>
              <div>
                <Icon size={30} strokeWidth={1.4} />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.agendaSection} id="agenda">
        <div className={`${styles.container} ${styles.agendaLayout}`}>
          <div className={styles.agendaIntro}>
            <p className={styles.overline}>02 / EL PLAN DEL DOMINGO</p>
            <h2>
              Una mañana.
              <br />
              <em>
                Mucho para
                <br />
                llevarte.
              </em>
            </h2>
            <p>
              Del primer café a la última charla.
              <br />
              Te acompañamos durante toda la experiencia.
            </p>
            <div className={styles.agendaNote}>
              <Footprints size={26} />
              <span>
                El comienzo de un nuevo hábito.
                <br />
                <strong>Una caminata para compartir cada mes.</strong>
              </span>
            </div>
          </div>
          <ol className={styles.timeline}>
            {schedule.map(([time, title, detail], i) => (
              <li key={time}>
                <time>{time}</time>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="lugar" className={`${styles.container} ${styles.location}`}>
        <div className={styles.venuePhoto}>
          <Image
            src="/silver/augusta/01.jpg"
            alt="Terraza de Augusta con vista al verde de Palermo"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span>UN RESPIRO EN LA CIUDAD</span>
        </div>
        <div className={styles.locationCopy}>
          <p className={styles.overline}>03 / NUESTRO PUNTO DE ENCUENTRO</p>
          <h2>
            Mucho verde.
            <br />
            Buena mesa.
            <br />
            <em>Augusta.</em>
          </h2>
          <p>
            En el corazón de Palermo, un lugar para empezar caminando y terminar
            compartiendo un brunch con tiempo para conversar.
          </p>
          <div className={styles.address}>
            <MapPin size={22} />
            <span>
              <strong>Augusta, Palermo</strong>
              <br />
              {SILVER_EVENT.venueAddress}
            </span>
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Av.+Ernesto+Tornquist+6385+CABA"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.textLink}
          >
            Cómo llegar <ArrowUpRight size={19} />
          </a>
        </div>
      </section>
      <section className={styles.sponsorsSection} id="marcas">
        <div className={styles.container}>
          <p className={styles.overline}>
            EL BIENESTAR SE CONSTRUYE EN COMPAÑÍA
          </p>
          <h2>
            Marcas que dan <em>el paso.</em>
          </h2>
          <div className={styles.sponsorGrid} aria-label="Marcas confirmadas">
            <div>
              <Image
                src="/silver/sponsors/nutren-real.svg"
                alt="Nutren"
                width={150}
                height={75}
              />
            </div>
            <div>
              <Image
                src="/silver/sponsors/farmacity-real.svg"
                alt="Farmacity"
                width={165}
                height={42}
              />
            </div>
            <div className={styles.extyLogo}>
              <Image
                src="/silver/sponsors/exty-wordmark.png"
                alt="exty"
                width={145}
                height={55}
              />
            </div>
            <div>
              <Image
                src="/silver/sponsors/bnb.webp"
                alt="BNB — Benevia Natural Brands"
                width={125}
                height={80}
              />
            </div>
            <div>
              <Image
                src="/silver/sponsors/cosmico.webp"
                alt="Yerba Cósmico"
                width={155}
                height={76}
              />
            </div>
            <div className={styles.bydLogo}>
              <Image
                src="/silver/sponsors/byd.svg"
                alt="BYD"
                width={135}
                height={28}
              />
            </div>
          </div>
          <div className={styles.organizers}>
            <p>ORGANIZAN EN COLABORACIÓN</p>
            <div className={styles.organizerLogos}>
              <Image
                src="/brand/logo-green.svg"
                alt="Pasito"
                width={97}
                height={25}
              />
              <span aria-hidden="true">+</span>
              <Image
                src="/evento-pasito/sponsors/kiwell-2025.png"
                alt="Kiwell"
                width={104}
                height={42}
              />
            </div>
          </div>
        </div>
      </section>
      <section
        className={`${styles.container} ${styles.included}`}
        id="entradas"
      >
        <div>
          <p className={styles.overline}>04 / REGALATE ESTA MAÑANA</p>
          <h2>
            Una mañana para cuidarte.
            <br />
            <em>Todo incluido.</em>
          </h2>
          <p>
            Caminata, charla y una mesa compartida.
            <br />
            Todo está incluido en tu entrada.
          </p>
        </div>
        <div className={styles.includedList}>
          <div className={styles.priceDisplay}>
            <strong>{silverMoney(SILVER_TICKET_TIERS[0].unitPrice)}</strong>
            <span>ARS / persona</span>
          </div>
          <ul>
            {included.map((item) => (
              <li key={item}>
                <Check size={19} />
                {item}
              </li>
            ))}
          </ul>
          <p>Entrada para el encuentro del 17 de octubre.</p>
        </div>
      </section>
      <SilverTicketCheckout />
      <SilverQuestions aiEnabled={Boolean(process.env.TYPESAFE_API_KEY)} />
      <section className={styles.closing}>
        <p>UNA CAMINATA AL MES. UN TIEMPO PARA VOS.</p>
        <h2>
          Nos vemos
          <br />
          <em>en el próximo paso.</em>
        </h2>
        <Buy />
      </section>
      <footer className={`${styles.container} ${styles.footer}`}>
        <Link href="/" aria-label="Pasito, inicio">
          <Image
            src="/brand/logo-green.svg"
            alt="Pasito"
            width={97}
            height={25}
          />
        </Link>
        <p>Silver Walks by Nutren · Organizan Pasito + Kiwell · 2026</p>
        <nav aria-label="Enlaces legales">
          <Link href="/terminos/silver-walks">Términos del evento</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
      </footer>
      <div className={styles.mobileBuyBar}>
        <span>
          <small>17 OCT · TODO INCLUIDO</small>
          <strong>{silverMoney(SILVER_TICKET_TIERS[0].unitPrice)}</strong>
        </span>
        <Buy label="Sumarme" />
      </div>
    </main>
  )
}
