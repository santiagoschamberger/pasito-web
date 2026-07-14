import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, BarChart3, Check, Target } from 'lucide-react'

import styles from '../marketing.module.css'
import { BRANDS_WHATSAPP_URL, DISNEY_LOGO_URL, MarketingFooter, MarketingNav, NumberedOverline } from '@/components/marketing/Marketing'
import { MarketingMotion } from '@/components/marketing/MarketingMotion'

export const metadata: Metadata = {
  title: 'Pasito para Marcas — Convertí movimiento en participación',
  description: 'Pasito conecta marcas con personas activas en el momento en que buscan una recompensa, con activaciones medibles dentro y fuera de la app.',
  openGraph: {
    title: 'Pasito para Marcas — Convertí movimiento en participación',
    description: 'No vendemos espacios. Vendemos personas en movimiento.',
    type: 'website',
  },
}

const AUDIENCE = [
  { value: '64%', age: '18 a 34', title: 'Jóvenes urbanos y activos.', body: 'Fintech, bebidas, indumentaria, telco, food y entretenimiento.' },
  { value: '19%', age: '35 a 49', title: 'Poder de consumo y decisión.', body: 'Bancos, retail, autos, salud, educación y turismo.' },
  { value: '11%', age: '50+', title: 'Adultos que caminan todos los días.', body: 'Seguros, farma, obras sociales y bienestar.' },
]

const COUNTRY_AUDIENCE = [
  {
    code: 'AR',
    name: 'Argentina',
    registered: '539.864',
    active: '+403 mil',
    young: '68%',
    averageAge: '29',
    cities: [['CABA', '157 mil'], ['La Plata', '11,8 mil'], ['Córdoba', '9,9 mil'], ['Rosario', '5,5 mil']],
    neighborhoods: [['Palermo', '49,2 mil'], ['Recoleta', '18,4 mil'], ['Caballito', '18,1 mil'], ['Belgrano', '18 mil']],
    interests: [{ label: 'Gastronomía', share: 77 }, { label: 'Cafeterías', share: 75 }, { label: 'Cine', share: 58 }, { label: 'Deportes', share: 36 }],
  },
  {
    code: 'UY',
    name: 'Uruguay',
    registered: '87.346',
    active: '+79 mil',
    young: '67%',
    averageAge: '29',
    cities: [['Montevideo', '66,1 mil'], ['Ciudad de la Costa', '3 mil'], ['Canelones', '1,1 mil'], ['Maldonado', '1,1 mil']],
    neighborhoods: [['Pocitos', '7,6 mil'], ['Cordón', '6,2 mil'], ['Centro', '5,6 mil'], ['Malvín', '2,7 mil']],
    interests: [{ label: 'Gastronomía', share: 77 }, { label: 'Cafeterías', share: 74 }, { label: 'Cine', share: 59 }, { label: 'Deportes', share: 43 }],
  },
]

function CountrySilhouette({ code }: { code: 'AR' | 'UY' }) {
  return (
    <div className={`${styles.countryMap} ${code === 'AR' ? styles.countryMapArgentina : styles.countryMapUruguay}`} aria-hidden="true">
      <Image
        src={code === 'AR' ? '/marketing/brands/argentina-map.png' : '/marketing/brands/uruguay-map.png'}
        alt=""
        width={code === 'AR' ? 724 : 1600}
        height={code === 'AR' ? 1586 : 1737}
        unoptimized
      />
    </div>
  )
}

const FORMATS = [
  { name: 'Presencia Always-On', lead: 'Tu marca siempre a la vista, cerca de la decisión.', features: ['Banner en la home', 'Pin destacado en el mapa', 'Ideal para retail, comercios y puntos físicos'], accent: false },
  { name: 'Activación Segmentada', lead: 'Una invitación directa a la audiencia que elegís.', features: ['Push + mail segmentados', 'Por ciudad, barrio y edad', 'Ideal para lanzamientos, aperturas y fechas clave'], accent: false },
  { name: 'Desafío de Marca', lead: 'La comunidad camina por tu marca.', features: ['Awareness, engagement y data', 'Objetivo y recompensa a medida', 'Participación, clicks, pasos y canjes medibles'], accent: true },
]

const CHALLENGES = [
  { name: 'Desafío 7 días', detail: '2 notificaciones + colaboración en redes.', body: '~35.000 personas anotadas caminando por tu marca durante una semana.', tone: 'accent' },
  { name: 'Desafío 3 días', detail: '1 notificación.', body: 'Una activación corta y potente para lanzamientos o fechas clave.', tone: 'pink' },
  { name: 'Express 24 hs', detail: '1 notificación.', body: 'Ideal para probar el canal y transformar una fecha puntual en participación.', tone: 'green' },
  { name: 'Main Sponsor', detail: 'Visibilidad principal durante todo el desafío.', body: 'Tu marca destacada por encima de cada momento de la experiencia.', tone: 'dark' },
]

type SocialProofBrand =
  | { name: string; src: string; width: number; height: number; remote?: boolean }

const SOCIAL_PROOF_BRANDS: SocialProofBrand[] = [
  { name: 'Disney', src: DISNEY_LOGO_URL, width: 142, height: 58, remote: true },
  { name: 'Decathlon', src: '/marketing/brands/decathlon.svg', width: 154, height: 36 },
  { name: 'KFC', src: '/marketing/brands/kfc.svg', width: 98, height: 36 },
  { name: "Wendy's", src: '/marketing/brands/wendys.svg', width: 96, height: 44 },
]

const MEASUREMENTS = ['Alcance en la app', 'Participantes registrados', 'Pasos generados', 'Clicks al link', 'Canjes', 'Historias compartidas', 'Segmentación por ciudad, barrio y edad', 'Aprendizajes para la próxima campaña']

export default function MarcasPage() {
  return (
    <main className={styles.page} data-marketing-page>
      <MarketingMotion />
      <MarketingNav active="marcas" />

      <header className={`${styles.hero} ${styles.brandsHero}`}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={`${styles.heroTitle} ${styles.brandsHeroTitle}`}>No vendemos espacios. <span className={styles.accent}>Vendemos personas</span> en movimiento.</h1>
            <p className={styles.heroText}>Personas abren Pasito para buscar dónde usar lo que ganaron caminando. Tu marca puede ser esa recompensa.</p>
            <div className={styles.heroButtons}>
              <a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Reservá tu activación <ArrowRight size={18} /></a>
              <a className={styles.outlineButton} href="#formatos">Ver formatos</a>
            </div>
            <p className={styles.heroNote}>Activaciones con alcance, participación y medición en una sola experiencia.</p>
          </div>

          <div className={styles.brandsHeroArt} data-hero-tilt>
            <Image className={styles.brandsHeroPhone} src="/marketing/device-premios-list.png" alt="Pasito mostrando recompensas y comercios" width={696} height={1440} priority unoptimized />
          </div>
        </div>
      </header>

      <section className={styles.brandsSocialProofSection}>
        <div className={`${styles.container} ${styles.brandsSocialProof}`}>
          <div className={styles.brandsSocialProofIntro}><h2>Ya activaron con nosotros</h2></div>
          <div className={styles.brandsWordmarks} aria-label="Marcas que activaron con Pasito">
            {SOCIAL_PROOF_BRANDS.map((brand) => (
              <div className={styles.brandsWordmark} key={brand.name}>
                {brand.remote ? <img src={brand.src} alt={brand.name} width={brand.width} height={brand.height} /> : <Image src={brand.src} alt={brand.name} width={brand.width} height={brand.height} unoptimized />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.brandsContextSection}>
        <div className={`${styles.container} ${styles.brandsContext}`}>
          <div><h2 className={styles.sectionTitle}>El alcance solo ya no alcanza.</h2><p className={styles.brandsLead}>Las marcas necesitan algo más que visibilidad: participación, datos, visitas y acciones medibles. Pasito suma esa capa a tu plan de marketing.</p></div>
        </div>
      </section>

      <section className={styles.brandsInterlude}>
        <div className={styles.container}>
          <p>
            <span className={styles.brandsInterludeViolet}>El problema no es la falta de intención.</span>
            <span className={styles.brandsInterludePink}>Es la falta de un sistema que convierta intención en acción.</span>
            <span className={styles.brandsInterludeViolet}>Pasito es ese sistema.</span>
          </p>
        </div>
      </section>

      <section className={styles.brandsHowItWorksSection}>
        <div className={`${styles.container} ${styles.brandsHowItWorks}`}>
          <div>
            <NumberedOverline number="02">Cómo funciona</NumberedOverline>
            <h2 className={styles.sectionTitle}>Convertimos movimiento en intención.</h2>
            <p className={styles.sectionBody}>Tu marca aparece en el mejor momento posible: cuando la persona ya hizo el esfuerzo y busca su recompensa.</p>
          </div>
          <div className={styles.brandsFlow}>
            {['La persona se mueve y gana Pasitos.', 'Abre la app motivada.', 'Busca dónde usarlos.', 'Encuentra tu marca.', 'Canjea, participa y comparte.'].map((step, index) => <article key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></article>)}
          </div>
        </div>
      </section>

      <section className={styles.brandsChangeSection}>
        <div className={`${styles.container} ${styles.brandsChangeInner}`}>
          <NumberedOverline number="03" light>El cambio</NumberedOverline>
          <h2 className={styles.sectionTitle}>De exposición a participación.</h2>
          <p className={styles.brandsChangeLead}>La diferencia no está solamente en cuántas personas alcanzás. Está en lo que hacen después.</p>
          <div className={styles.brandsComparisonGrid}>
            <article>
              <div className={styles.brandsComparisonHeader}><span className={styles.overline}>Pauta digital</span><span className={styles.brandsComparisonMode}>Contacto pasivo</span></div>
              <h3>La persona ve.</h3>
              <p className={styles.brandsComparisonKicker}>Alcance sin acción.</p>
              <ul><li>El contacto dura un scroll.</li><li>La medición termina en clicks.</li><li>La marca necesita interrumpir.</li></ul>
              <span className={styles.brandsComparisonNumber} aria-hidden="true">01</span>
            </article>
            <div className={styles.brandsComparisonShift} aria-hidden="true"><span>De ver</span><ArrowRight size={18} /><strong>A hacer</strong></div>
            <article className={styles.brandsComparisonPasito}>
              <div className={styles.brandsComparisonHeader}><span className={styles.overline}>Pasito</span><span className={styles.brandsComparisonMode}>Contacto activo</span></div>
              <h3>La persona participa.</h3>
              <p className={styles.brandsComparisonKicker}>Una acción que deja señal.</p>
              <ul><li>Camina por un objetivo.</li><li>Medís pasos, canjes, clicks y visitas.</li><li>La marca aparece como recompensa.</li></ul>
              <span className={styles.brandsComparisonNumber} aria-hidden="true">02</span>
            </article>
          </div>
          <p className={styles.brandsChangeClose}>No reemplazamos tu pauta. <span>La hacemos caminar.</span></p>
        </div>
      </section>

      <section className={`${styles.container} ${styles.brandsAudience}`}>
        <h2 className={`${styles.sectionTitle} ${styles.brandsAudienceTitle}`}>Dos países. Dos audiencias.</h2>
        <p className={styles.brandsAudienceLead}>Edades, ciudades e intereses distintos. Una misma plataforma para elegir dónde, a quién y con qué mensaje activar.</p>
        <div className={styles.brandsAudienceGrid}>
          {AUDIENCE.map((group) => <article key={group.age}><strong>{group.value}</strong><span>{group.age}</span><h3>{group.title}</h3><p>{group.body}</p></article>)}
        </div>
        <p className={styles.brandsFinePrint}>Los grupos principales representan el 94% de la audiencia. Segmentable por barrio, ciudad y edad: no le hablás a cualquiera, le hablás a personas activas donde realmente te importa.</p>

        <div className={styles.countryAudienceGrid}>
          {COUNTRY_AUDIENCE.map((country) => (
            <article className={styles.countryAudienceCard} key={country.code}>
              <header>
                <div>
                  <span>{country.name}</span>
                  <strong>{country.registered}</strong>
                  <small>personas registradas</small>
                </div>
                <CountrySilhouette code={country.code as 'AR' | 'UY'} />
              </header>

              <div className={styles.countryAudienceStats}>
                <div><strong>{country.active}</strong><span>activas en 30 días</span></div>
                <div><strong>{country.young}</strong><span>tiene entre 18 y 34</span></div>
                <div><strong>{country.averageAge}</strong><span>años de edad promedio</span></div>
              </div>

              <div className={styles.countryAudienceDetails}>
                <section>
                  <h4>Ciudades con densidad</h4>
                  <div className={styles.countryAudiencePlaces}>{country.cities.map(([name, value]) => <span key={name}><b>{name}</b><small>{value} activos</small></span>)}</div>
                </section>
                <section>
                  <h4>Barrios que ya se mueven</h4>
                  <div className={styles.countryAudiencePlaces}>{country.neighborhoods.map(([name, value]) => <span key={name}><b>{name}</b><small>{value} activos</small></span>)}</div>
                </section>
                <section className={styles.countryAudienceInterests}>
                  <h4>Afinidades declaradas</h4>
                  <div>{country.interests.map((interest) => <span key={interest.label}><b>{interest.label}</b><i><em style={{ width: `${interest.share}%` }} /></i><small>{interest.share}%</small></span>)}</div>
                </section>
              </div>
            </article>
          ))}
        </div>
        <p className={styles.countryAudienceSource}>Fuente: datos agregados y anónimos de perfiles y actividad de Pasito en Supabase. Activos durante los últimos 30 días, corte 11 de julio de 2026. Ciudades y barrios según ubicación declarada; afinidades sobre usuarios activos de cada país.</p>
      </section>

      <section id="formatos" className={styles.brandsFormatsSection}>
        <div className={`${styles.container} ${styles.brandsFormats}`}>
          <NumberedOverline number="05">Formatos</NumberedOverline>
          <h2 className={styles.sectionTitle}>Tres formas de entrar.</h2>
          <div className={styles.brandsFormatsGrid}>
            {FORMATS.map((format) => <article className={format.accent ? styles.brandsFormatFeatured : ''} key={format.name}><span className={styles.overline}>{format.name}</span><p className={styles.brandsFormatLead}>{format.lead}</p><ul>{format.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><a href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Consultar formato <ArrowRight size={16} /></a></article>)}
          </div>
        </div>
      </section>

      <section className={styles.brandsChallengesSection}>
        <div className={`${styles.container} ${styles.brandsChallengesInner}`}>
          <div><NumberedOverline number="06" light>Desafíos de marca</NumberedOverline><h2 className={styles.sectionTitle}>Miles de personas caminando por tu marca.</h2></div>
          <div className={styles.brandsChallengeGrid}>{CHALLENGES.map((challenge, index) => <article className={styles[`brandsChallenge${challenge.tone[0].toUpperCase()}${challenge.tone.slice(1)}`]} key={challenge.name}><span className={styles.brandsChallengeIndex}>{String(index + 1).padStart(2, '0')}</span><div><h3>{challenge.name}</h3><p>{challenge.detail}</p></div><small>{challenge.body}</small></article>)}</div>
        </div>
      </section>

      <section className={styles.brandsResultsSection}>
        <div className={`${styles.container} ${styles.brandsResults}`}>
          <div className={styles.brandsCaseStudy}>
            <div className={styles.brandsCaseLogo}><Image src="/marketing/brands/decathlon.svg" alt="Decathlon" width={158} height={38} unoptimized /></div>
            <div><NumberedOverline number="07">Caso real</NumberedOverline><h2 className={styles.sectionTitle}>Decathlon lo probó.</h2><p className={styles.sectionBody}>La gente caminó, participó y difundió la marca por elección propia.</p></div>
            <div className={styles.brandsCaseStats}><div><strong>53.000</strong><span>personas se anotaron y caminaron por la marca.</span></div><div><strong>~1.000</strong><span>compartieron la historia en Instagram.</span></div></div>
          </div>

          <div className={styles.brandsMeasurement}>
            <div>
              <NumberedOverline number="08" light>Medición</NumberedOverline>
              <h2 className={styles.sectionTitle}>Cada activación termina con datos, no con sensaciones.</h2>
              <p className={styles.brandsMeasurementBody}>Tu equipo recibe una lectura clara de qué pasó, quién participó y qué conviene optimizar en la próxima campaña.</p>
            </div>
            <ul className={styles.brandsMeasurementList} aria-label="Datos incluidos en cada activación">
              {MEASUREMENTS.map((measurement) => <li key={measurement}><span><BarChart3 size={17} /></span><strong>{measurement}</strong></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.brandsScarcity}`}>
        <Target size={28} /><div><h2>Cada activación tiene que sentirse bien.</h2><p>No abrimos campañas ilimitadas. Limitamos las marcas activas por mes para no saturar la app ni quemar la experiencia del usuario.</p></div><div className={styles.brandsScarcityPills}><span>Menos ruido</span><span>Más visibilidad</span><span>Más impacto</span></div>
      </section>

      <section className={`${styles.container} ${styles.finalWrap} ${styles.brandsFinalWrap}`}>
        <div className={styles.finalCta}>
          <span className={styles.orbOne} aria-hidden="true" /><span className={styles.orbTwo} aria-hidden="true" />
          <h2 className={styles.finalTitle}>Cada paso es una señal.<br />Cada recompensa es una visita.<br /><span className={styles.accent}>Cada visita es comercio.</span></h2>
          <p className={styles.finalText}>La marca no interrumpe. La marca recompensa. Reservá tu lugar antes de que se llene el mes.</p>
          <div className={styles.finalActions}><a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={BRANDS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Reservá tu activación <ArrowRight size={18} /></a></div>
        </div>
      </section>

      <MarketingFooter brands />
    </main>
  )
}
