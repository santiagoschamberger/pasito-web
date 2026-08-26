import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight } from 'lucide-react'

import styles from './marcas.module.css'
import { MarketingMotion } from '@/components/marketing/MarketingMotion'

const BRANDS_WHATSAPP_URL = 'https://wa.me/5491136491620?text=Hola%2C%20quiero%20reservar%20una%20activaci%C3%B3n%20de%20marca%20en%20Pasito.'

export const metadata: Metadata = {
  title: 'Pasito para Marcas — El próximo pasito de tu marca',
  description: 'Beneficios, comunicación, desafíos y experiencias para activar una comunidad que se mueve todos los días.',
  openGraph: {
    title: 'Pasito para Marcas — El próximo pasito de tu marca',
    description: 'Convertí movimiento en visitas, participación y resultados medibles.',
    type: 'website',
  },
}

const FORMATS = [
  {
    number: '01',
    objective: 'Visitas y canjes',
    title: 'Beneficio en Pasito',
    body: 'Convertí Pasitos en visitas al local, compras online o reservas de servicios.',
    detail: 'Puntos físicos · E-commerce · Servicios',
  },
  {
    number: '02',
    objective: 'Descubrimiento local',
    title: 'Punto destacado en el mapa',
    body: 'Ganá visibilidad cuando una persona está eligiendo dónde ir cerca suyo.',
    detail: 'Prioridad por zona · Pin con foto · Sucursales estratégicas',
  },
  {
    number: '03',
    objective: 'Alcance segmentado',
    title: 'Banners y notificaciones',
    body: 'Banners y notificaciones para activar a la audiencia que realmente te interesa.',
    detail: 'País · Ciudad · Barrio · Edad',
  },
  {
    number: '04',
    objective: 'Producto estrella',
    title: 'Desafío de pasos',
    body: 'La comunidad camina por un objetivo y una recompensa definidos con tu marca.',
    detail: '24 horas · 3 días · 7 días · A medida',
    featured: true,
  },
  {
    number: '05',
    objective: 'Convocatoria',
    title: 'Evento dentro de Pasito',
    body: 'Publicá tu evento para que la comunidad lo descubra y se inscriba desde la app.',
    detail: 'Publicación · Registro · Banners · Notificaciones',
  },
  {
    number: '06',
    objective: 'Experiencia compartida',
    title: 'Pasito Walking Club',
    body: 'Integrá tu marca a una experiencia que combina movimiento, bienestar y comunidad.',
    detail: 'Main sponsor · Sponsor de actividad · Activación',
  },
  {
    number: '07',
    objective: 'Llave en mano',
    title: 'El evento de tu marca',
    body: 'Diseñamos una experiencia propia y llevamos la comunidad hasta tu objetivo.',
    detail: 'Concepto · Mecánica · Tecnología · Convocatoria · Medición',
  },
  {
    number: '08',
    objective: 'Bienestar corporativo',
    title: 'Pasito Empresas',
    body: 'Una herramienta para activar equipos con metas compartidas y desafíos internos.',
    detail: 'Desafíos · Rankings · Reconocimientos · Métricas',
  },
]

const MEASUREMENT = [
  { title: 'Alcance', detail: 'Usuarios, impresiones y aperturas.' },
  { title: 'Participación', detail: 'Inscriptos, pasos y finalización.' },
  { title: 'Acción', detail: 'Clics, registros, canjes y visitas.' },
  { title: 'Comunidad', detail: 'Asistencia, contenido y recurrencia.' },
]

const BRAND_LOGOS = [
  { name: 'Decathlon', src: '/marketing/brands/decathlon.svg', width: 154, height: 36 },
  { name: 'KFC', src: '/marketing/brands/kfc.svg', width: 94, height: 34 },
  { name: "Wendy's", src: '/marketing/brands/wendys.svg', width: 92, height: 44 },
  { name: 'Açaí Brasil', src: '/marketing/brands/acai-brasil.png', width: 150, height: 38 },
]

export default function MarcasPage() {
  return (
    <main className={styles.page} data-marketing-page>
      <MarketingMotion />

      <nav className={styles.nav} aria-label="Navegación principal">
        <div className={styles.navInner}>
          <Link href="/" aria-label="Pasito, inicio">
            <Image src="/brand/logo-lime.svg" alt="Pasito" width={118} height={28} priority />
          </Link>
          <div className={styles.navLinks}>
            <a href="#formatos">Formatos</a>
            <a href="#casos">Casos</a>
            <a className={styles.navCta} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Hablemos <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Pasito para marcas</p>
            <h1>El próximo <span>pasito</span> de tu marca.</h1>
            <p className={styles.heroLead}>Activá una comunidad que se mueve todos los días. Convertí pasos en visitas, participación y experiencias medibles.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Contanos tu objetivo <ArrowRight size={19} aria-hidden="true" />
              </a>
              <a className={styles.textButton} href="#como-funciona">
                Ver cómo funciona <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className={styles.heroVisual} data-hero-tilt>
            <span className={styles.heroCircle} aria-hidden="true" />
            <Image
              className={styles.heroPhone}
              src="/marketing/device-premios-list.png"
              alt="Beneficios disponibles dentro de la app de Pasito"
              width={696}
              height={1440}
              sizes="(max-width: 760px) 72vw, 360px"
              priority
              unoptimized
            />
            <Image className={styles.heroPaloma} src="/paloma-corriendo.png" alt="" width={220} height={220} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.heroStats} aria-label="Pasito en números">
          <div><strong>620 mil</strong><span>personas registradas</span></div>
          <div><strong>255 mil</strong><span>activos por día</span></div>
          <div><strong>7,6 M</strong><span>contactos por mes</span></div>
          <p>Argentina · corte julio 2026</p>
        </div>
      </header>

      <section id="como-funciona" className={styles.mechanism}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Movimiento → intención</p>
            <h2>Tu marca aparece cuando la persona está lista para elegir.</h2>
          </div>

          <div className={styles.steps}>
            <article>
              <span>01</span>
              <h3>Camina.</h3>
              <p>La persona se mueve todos los días.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Gana.</h3>
              <p>Su actividad se convierte en Pasitos.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Elige.</h3>
              <p>Abre la app y descubre dónde usarlos.</p>
            </article>
          </div>

          <div className={styles.conversionBand}>
            <div>
              <strong>114.718</strong>
              <span>canjes confirmados</span>
            </div>
            <div>
              <strong>47%</strong>
              <span>con compra adicional</span>
            </div>
            <p>La recompensa abre la puerta. La marca convierte la visita.</p>
          </div>
        </div>
      </section>

      <section id="formatos" className={styles.solutions}>
        <div className={styles.container}>
          <div className={styles.solutionsHeading}>
            <p className={styles.kicker}>Formatos de activación</p>
            <h2>Elegí qué querés que pase.</h2>
            <p>Desde una visita o un canje hasta una experiencia completa. Podés elegir un formato o combinarlos.</p>
          </div>

          <div className={styles.solutionsGrid}>
            {FORMATS.map((format) => (
              <article className={format.featured ? styles.formatFeatured : undefined} key={format.number}>
                <div className={styles.formatMeta}>
                  <span className={styles.solutionNumber}>{format.number}</span>
                  <span className={styles.formatObjective}>{format.objective}</span>
                </div>
                <h3>{format.title}</h3>
                <p>{format.body}</p>
                <small>{format.detail}</small>
              </article>
            ))}
          </div>

          <div className={styles.commerceCallout}>
            <p><strong>¿Tenés un comercio físico?</strong> Podés empezar gratis o destacarte en tu zona.</p>
            <Link href="/comercios">Ver planes para comercios <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={styles.brandProof} aria-label="Marcas que ya activaron con Pasito">
        <div className={styles.container}>
          <p>Marcas que ya se movieron con Pasito</p>
          <div className={styles.brandLogos}>
            {BRAND_LOGOS.map((brand) => (
              <Image key={brand.name} src={brand.src} alt={brand.name} width={brand.width} height={brand.height} unoptimized />
            ))}
          </div>
        </div>
      </section>

      <section id="casos" className={styles.cases}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Casos reales</p>
            <h2>De la pantalla a la calle.</h2>
          </div>

          <div className={styles.caseGrid}>
            <article className={styles.challengeCase}>
              <div className={styles.caseTag}>Desafío de pasos</div>
              <Image src="/marketing/brands/decathlon.svg" alt="Decathlon" width={180} height={42} unoptimized />
              <h3>Miles de personas caminando por una marca.</h3>
              <p>Un desafío convierte objetivo, recompensa y comunicación en una experiencia completa.</p>
              <div className={styles.caseStats}>
                <div><strong>53.000</strong><span>inscriptos</span></div>
                <div><strong>~1.000</strong><span>historias compartidas</span></div>
              </div>
            </article>

            <article className={styles.eventCase}>
              <div className={styles.eventImage}>
                <Image src="/evento-pasito/og.png" alt="Pasito Walking Club" fill sizes="(max-width: 760px) 100vw, 50vw" />
              </div>
              <div className={styles.eventCopy}>
                <div className={styles.caseTag}>Experiencia de marca</div>
                <h3>La comunidad también elige encontrarse.</h3>
                <p>Walking Club reunió movimiento, bienestar, gastronomía, música y marcas en una misma jornada.</p>
                <div className={styles.caseStats}>
                  <div><strong>+300</strong><span>personas</span></div>
                  <div><strong>+15</strong><span>marcas integradas</span></div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.measurement}>
        <div className={styles.container}>
          <div className={styles.measurementHeading}>
            <p className={styles.kicker}>Medición e impacto</p>
            <h2>Cada activación termina con resultados.</h2>
          </div>
          <div className={styles.measurementGrid}>
            {MEASUREMENT.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div>
            <p className={styles.kicker}>Una propuesta a medida</p>
            <h2>Tu objetivo. Nuestra comunidad. Una experiencia que se pueda medir.</h2>
          </div>
          <div className={styles.finalAction}>
            <a className={styles.darkButton} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Hablemos <ArrowRight size={20} aria-hidden="true" />
            </a>
            <span>partners.pasito.app</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <Link href="/" aria-label="Pasito, inicio">
            <Image src="/brand/logo-lime.svg" alt="Pasito" width={100} height={24} />
          </Link>
          <p>© 2026 Pasito. Argentina · Uruguay.</p>
        </div>
      </footer>
    </main>
  )
}
