import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, Footprints, Gift, MapPin, Megaphone, CalendarDays, Users, Sparkles, Building2, MousePointer2, ChartNoAxesCombined, Check } from 'lucide-react'

import styles from './marcas.module.css'
import shared from '../marketing.module.css'
import { MarketingNav, MarketingFooter } from '@/components/marketing/Marketing'
import { PARTNER_BRANDS, type MarketingBrand } from '@/lib/marketing-brands'
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

const BRAND_LOGOS: MarketingBrand[] = [
  { name: 'Decathlon', src: '/marketing/brands/decathlon.svg', width: 154, height: 36 },
  { name: 'KFC', src: '/marketing/brands/kfc.svg', width: 94, height: 34 },
  { name: "Wendy's", src: '/marketing/brands/wendys.svg', width: 92, height: 44 },
  { name: 'Açaí Brasil', src: '/marketing/brands/acai-brasil.png', width: 150, height: 38 },
  ...PARTNER_BRANDS,
]

const FORMAT_ICONS = [Gift, MapPin, Megaphone, Footprints, CalendarDays, Users, Sparkles, Building2]

export default function MarcasPage() {
  return (
    <main className={`${shared.page} ${styles.page}`} data-marketing-page>
      <MarketingMotion />
      <MarketingNav active="marcas" />

      <header className={styles.hero}>
        <div className={`${shared.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><span /> Pasito para marcas</span>
            <h1>El próximo <span>pasito</span> de tu marca.</h1>
            <p className={styles.heroLead}>Activá una comunidad que se mueve todos los días. Convertí pasos en visitas, participación y experiencias medibles.</p>
            <div className={styles.heroActions}>
              <a className={`${shared.pinkButton} ${shared.heroPrimary}`} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Armemos una campaña <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <a className={styles.heroSecondary} href="#formatos">Explorar formatos <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <p className={styles.heroNote}>En la app. En la calle. En la vida de las personas.</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroHalo} aria-hidden="true" />
            <div className={styles.phoneTilt} data-hero-tilt>
              <Image className={styles.heroPhone} src="/marketing/device-premios-list.png" alt="Premios y beneficios de marcas dentro de Pasito" width={696} height={1440} sizes="(max-width: 640px) 65vw, 285px" priority unoptimized />
            </div>
            <div className={styles.heroSticker}>
              <span><MapPin size={22} aria-hidden="true" /></span>
              <div><small>El próximo destino</small><strong>puede ser tu marca.</strong></div>
            </div>
          </div>
        </div>
        <div className={`${shared.container} ${styles.heroStats}`} aria-label="Pasito en números, Argentina, julio de 2026">
          <div><strong>620 mil</strong><span>personas registradas</span></div>
          <div><strong>255 mil</strong><span>activos por día</span></div>
          <div><strong>7,6 M</strong><span>contactos por mes</span></div>
          <p>Una comunidad en movimiento.<small>Argentina · corte julio 2026</small></p>
        </div>
      </header>

      <section className={`${shared.container} ${styles.brandProof}`} aria-label="Marcas que ya activaron con Pasito">
        <p>Marcas que ya se mueven con nosotros</p>
        <div className={styles.brandLogos}>
          {BRAND_LOGOS.map((brand) => <div key={brand.name}><Image style={brand.monochrome ? { filter: 'brightness(0)' } : undefined} src={brand.src} alt={brand.name} width={brand.width} height={brand.height} unoptimized /></div>)}
        </div>
      </section>

      <section id="como-funciona" className={`${shared.container} ${styles.section}`}>
        <div className={styles.sectionHeading}>
          <div><span className={shared.overline}>Una conexión que pasa en la vida real</span><h2>De un paso<br />a una <span>elección.</span></h2></div>
          <p>Tu marca aparece en un momento simple: cuando alguien busca dónde ir, qué descubrir o en qué participar.</p>
        </div>
        <div className={styles.steps}>
          <article><span className={styles.stepIcon}><Footprints size={28} aria-hidden="true" /></span><small>01 / Movimiento</small><h3>Sale a caminar.</h3><p>Una actividad cotidiana que suma bienestar y ganas de descubrir.</p></article>
          <article><span className={styles.stepIcon}><Gift size={28} aria-hidden="true" /></span><small>02 / Motivación</small><h3>Gana Pasitos.</h3><p>Cada paso acerca a la persona a una recompensa que le interesa.</p></article>
          <article><span className={styles.stepIcon}><MousePointer2 size={28} aria-hidden="true" /></span><small>03 / Encuentro</small><h3>Elige tu marca.</h3><p>Descubre un beneficio, visita un local o se suma a una experiencia.</p></article>
        </div>
        <div className={styles.conversionBand}>
          <p>La recompensa abre la puerta.<br /><strong>La experiencia hace la diferencia.</strong></p>
          <div><strong>114.718</strong><span>canjes confirmados</span></div>
          <div><strong>47%</strong><span>con compra adicional</span></div>
        </div>
      </section>

      <section id="formatos" className={styles.solutions}>
        <div className={shared.container}>
          <div className={styles.sectionHeading}>
            <div><span className={shared.overline}>Formatos de activación</span><h2>Una idea para cada<br /><span>objetivo.</span></h2></div>
            <p>Más visitas, más participación o un encuentro memorable. Elegimos juntos el formato y lo hacemos a tu medida.</p>
          </div>
          <div className={styles.solutionsGrid}>
            {FORMATS.map((format, index) => {
              const Icon = FORMAT_ICONS[index]
              return <article className={`${styles.formatCard} ${format.featured ? styles.formatFeatured : ''}`} key={format.number}>
                <div className={styles.formatTop}><span className={styles.formatIcon}><Icon size={24} aria-hidden="true" /></span><span>{format.objective}</span></div>
                <h3>{format.title}</h3><p>{format.body}</p><small>{format.detail}</small>
              </article>
            })}
          </div>
          <div className={styles.commerceCallout}><p><strong>¿Tenés un local?</strong> También podés empezar con un beneficio en Pasito.</p><Link href="/comercios">Conocé los planes <ArrowRight size={17} aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section id="casos" className={styles.cases}>
        <div className={shared.container}>
          <div className={`${styles.sectionHeading} ${styles.lightHeading}`}>
            <div><span className={shared.overline}>Así se vive en Pasito</span><h2>De la pantalla<br />a <span>la calle.</span></h2></div>
            <p>Personas que participan, se encuentran y se llevan una historia con tu marca.</p>
          </div>
          <div className={styles.caseGrid}>
            <article className={styles.challengeCase}>
              <span className={styles.caseTag}>Desafío de pasos</span>
              <Image className={styles.decathlonLogo} src="/marketing/brands/decathlon.svg" alt="Decathlon" width={180} height={42} unoptimized />
              <h3>Un objetivo.<br />Miles de personas<br />en movimiento.</h3>
              <p>Una recompensa y un desafío compartido convierten a la marca en parte de la rutina.</p>
              <div className={styles.caseStats}><div><strong>53.000</strong><span>inscriptos</span></div><div><strong>~1.000</strong><span>historias compartidas</span></div></div>
            </article>
            <article className={styles.eventCase}>
              <div className={styles.eventImage}><Image src="/evento-pasito/tomate-rosedal.webp" alt="Tomate Rosedal, lugar de encuentro del Pasito Walking Club" fill sizes="(max-width: 760px) 100vw, 50vw" /><span className={styles.photoTag}>Pasito Walking Club <ArrowUpRight size={16} aria-hidden="true" /></span></div>
              <div className={styles.eventCopy}><h3>Las mejores conexiones<br />se hacen caminando.</h3><p>Movimiento, bienestar, gastronomía y marcas en una misma jornada.</p><div className={styles.caseStats}><div><strong>+300</strong><span>personas</span></div><div><strong>+15</strong><span>marcas integradas</span></div></div></div>
            </article>
          </div>
        </div>
      </section>

      <section className={`${shared.container} ${styles.section} ${styles.measurement}`}>
        <div className={styles.sectionHeading}><div><span className={shared.overline}>Medición e impacto</span><h2>Lo que pasa,<br /><span>se puede medir.</span></h2></div><p>Acordamos qué queremos lograr y cerramos cada activación con resultados concretos.</p></div>
        <div className={styles.measurementGrid}>{MEASUREMENT.map((item, index) => <article key={item.title}><span className={styles.measurementIndex}>0{index + 1}<ChartNoAxesCombined size={20} aria-hidden="true" /></span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <section className={`${shared.container} ${styles.finalWrap}`} id="contacto">
        <div className={styles.finalCta}><span className={styles.ctaDoodle} aria-hidden="true"><Footprints size={160} strokeWidth={1} /></span><span className={shared.overline}>Hagamos que pase</span><h2>Tu marca tiene<br />un próximo <span>pasito.</span></h2><p>Contanos qué querés lograr. Armamos una propuesta con el formato, la comunidad y las métricas que tienen sentido para vos.</p><a className={`${shared.pinkButton} ${shared.heroPrimary}`} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Contanos tu idea <ArrowUpRight size={19} aria-hidden="true" /></a><div className={styles.ctaNotes}><span><Check size={16} aria-hidden="true" /> Propuesta a medida</span><span><Check size={16} aria-hidden="true" /> Acompañamiento de principio a fin</span></div></div>
      </section>
      <MarketingFooter brands />
    </main>
  )
}
