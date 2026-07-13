import type { Metadata } from 'next'
import Image from 'next/image'
import { Activity, ArrowRight, ChartNoAxesCombined, EyeOff, FileCheck2, HeartPulse, MessageCircle, ShieldCheck, Sparkles, Trophy, UserRoundCheck } from 'lucide-react'

import styles from '../marketing.module.css'
import {
  ENTERPRISE_WHATSAPP_URL,
  MarketingFooter,
  MarketingNav,
  PhoneFan,
} from '@/components/marketing/Marketing'
import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import { formatRoundedMarketingMetric, getMarketingMetrics } from '@/lib/marketing-metrics'

export const metadata: Metadata = {
  title: 'Pasito Empresas — Activá a tu organización',
  description: 'Pasito Empresas convierte movimiento, beneficios y comunicaciones internas en participación medible para equipos más activos y conectados.',
  openGraph: {
    title: 'Pasito Empresas — Activá a tu organización',
    description: 'Una plataforma para transformar iniciativas internas en participación, desafíos y hábitos sostenidos.',
    type: 'website',
  },
}

const EVIDENCE = [
  {
    value: '31%',
    title: 'de las personas adultas',
    body: 'no alcanza los niveles de actividad física recomendados.',
    source: 'OMS · Actividad física',
    href: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    value: '20–30%',
    title: 'más riesgo de muerte',
    body: 'para quienes no realizan suficiente actividad física, frente a quienes sí la realizan.',
    source: 'OMS · Actividad física',
    href: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    value: '12.000 M',
    title: 'días laborales perdidos',
    body: 'cada año por depresión y ansiedad, según estimaciones globales.',
    source: 'OMS · Salud mental en el trabajo',
    href: 'https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work',
  },
]

const ENGAGEMENT = [
  { value: '78%', label: 'menos ausentismo' },
  { value: '18%', label: 'más productividad en ventas' },
  { value: '23%', label: 'más rentabilidad' },
  { value: '21%', label: 'menos rotación en organizaciones de alta rotación' },
]

const FEATURES = [
  {
    icon: Activity,
    title: 'Actividad, movimiento y desafíos',
    body: 'Objetivos de pasos, rachas, hábitos y desafíos entre equipos para convertir una intención en una práctica cotidiana.',
    tone: 'dark',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Dashboard para RR.HH.',
    body: 'Métricas agregadas de participación, constancia y evolución para decidir dónde impulsar.',
    tone: 'accent',
  },
  {
    icon: HeartPulse,
    title: 'Radar de equipo',
    body: 'Preguntas breves y personalizables para seguir energía, pertenencia, reconocimiento, motivación y colaboración.',
    tone: 'light',
  },
  {
    icon: MessageCircle,
    title: 'Comunicación que se completa',
    body: 'Transformá mensajes, capacitaciones e iniciativas internas en misiones medibles, más banners y notificaciones.',
    tone: 'pink',
  },
  {
    icon: Trophy,
    title: 'Beneficios que ya existen',
    body: 'Sumá beneficios y reconocimientos propios, junto con los comercios que ya forman parte de Pasito.',
    tone: 'light',
  },
]

const MEASUREMENTS = [
  ['Participación por equipo', 'Identificá qué áreas se activan y cuáles necesitan una invitación distinta.'],
  ['Adopción de iniciativas', 'Entendé qué beneficios y comunicaciones generan participación real.'],
  ['Colaboración transversal', 'Creá desafíos que conectan sedes, áreas y personas que no trabajan juntas todos los días.'],
  ['Reconocimiento y liderazgo', 'Destacá la constancia, el aporte colectivo y los logros compartidos.'],
  ['Hábitos y movimiento', 'Observá tendencias agregadas de actividad para acompañar hábitos más sostenibles.'],
]

const FAQS = [
  ['¿Qué pasa si una persona no usa la app?', 'No se cobra por una licencia inactiva: el esquema se calcula sobre las personas activas del mes.'],
  ['¿La empresa ve los datos individuales?', 'El panel está pensado para trabajar con tendencias agregadas de equipo. La participación es voluntaria y las reglas de visibilidad se definen antes del lanzamiento.'],
  ['¿Necesitamos comprar premios?', 'No necesariamente. Podés activar beneficios, reconocimientos y propuestas que ya existen en tu organización, además de la red de comercios de Pasito.'],
  ['¿Cuánto tarda la implementación?', 'El lanzamiento incluye onboarding acompañado, configuración inicial y un primer calendario de desafíos para empezar con una experiencia clara.'],
  ['¿En qué se diferencia de Pasito?', 'Pasito es una experiencia personal. Pasito Empresas suma objetivos compartidos, iniciativas internas y un panel para acompañar la participación de la organización.'],
]

export default async function EmpresasPage() {
  const metrics = await getMarketingMetrics()
  const totalUsers = formatRoundedMarketingMetric(metrics.totalUsers, 10_000)
  const newUsers = formatRoundedMarketingMetric(metrics.newUsersLast24Hours, 1_000)

  return (
    <main className={styles.page} data-marketing-page>
      <MarketingMotion />
      <MarketingNav active="empresas" />

      <header className={`${styles.hero} ${styles.enterpriseHero}`}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={`${styles.heroTitle} ${styles.enterpriseHeroTitle}`}>Una organización más activa empieza con un paso <span className={styles.accent}>que se comparte.</span></h1>
            <p className={styles.heroText}>Pasito convierte movimiento, beneficios y comunicaciones internas en desafíos simples que las personas quieren completar, y RR.HH. puede acompañar.</p>
            <div className={styles.heroButtons}>
              <a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={ENTERPRISE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Activemos tu organización <ArrowRight size={18} /></a>
              <a className={styles.outlineButton} href="#como-funciona">Ver cómo funciona</a>
            </div>
            <p className={styles.heroNote}>Para equipos, sedes y organizaciones de cualquier tamaño.</p>
          </div>

          <div className={styles.enterpriseHeroArt} data-hero-tilt>
            <Image className={styles.enterpriseHeroPhone} src="/marketing/device-home.png" alt="Pasito Empresas con desafíos para equipos" width={696} height={1440} priority unoptimized />
          </div>
        </div>
        <div className={styles.stats} aria-label="Pasito Empresas en números">
          <div className={styles.stat}><span className={styles.statValue}>{totalUsers}</span><span className={styles.statLabel}>personas ya usan Pasito</span></div>
          <div className={styles.stat}><span className={styles.statValue}>{newUsers}</span><span className={styles.statLabel}>personas nuevas en las últimas 24 h</span></div>
          <div className={styles.stat}><span className={styles.statValue}>{formatRoundedMarketingMetric(metrics.totalPartners, 100)}</span><span className={styles.statLabel}>comercios para sumar beneficios</span></div>
          <div className={styles.stat}><span className={styles.statValue}>USD 3</span><span className={styles.statLabel}>por persona activa / mes</span></div>
        </div>
      </header>

      <section className={`${styles.container} ${styles.enterpriseIntro}`}>
        <h2 className={styles.sectionTitle}>El bienestar no necesita otra plataforma que nadie abre.</h2>
        <p className={styles.enterpriseLead}>Necesita una dinámica diaria, accesible para todas las personas y conectada con lo que la organización ya hace.</p>
        <div className={styles.enterpriseEvidenceGrid}>
          {EVIDENCE.map((item) => (
            <article className={styles.enterpriseEvidenceCard} key={item.value}>
              <strong>{item.value}</strong>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <a href={item.href} target="_blank" rel="noreferrer">{item.source} ↗</a>
            </article>
          ))}
        </div>
        <p className={styles.enterpriseFinePrint}>La actividad física no reemplaza una estrategia integral de salud. Es una oportunidad concreta para hacer que el movimiento tenga lugar en la rutina laboral.</p>
      </section>

      <section className={styles.enterpriseEngagementSection}>
        <div className={`${styles.container} ${styles.enterpriseEngagementInner}`}>
          <h2 className={styles.sectionTitle}>Los equipos que se sienten parte también mueven los números.</h2>
          <p className={styles.sectionBody}>Gallup compara unidades de negocio con alto y bajo engagement. No es una promesa de resultado: es una señal del impacto que tiene una cultura donde las personas participan.</p>
          <div className={styles.enterpriseEngagementGrid}>
            {ENGAGEMENT.map((item) => <div className={styles.enterpriseEngagementMetric} key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
          <a className={styles.enterpriseSourceLink} href="https://www.gallup.com/workplace/321725/gallup-q12-meta-analysis-report.aspx" target="_blank" rel="noreferrer">Fuente: Gallup Q12 Meta-Analysis, 11th edition ↗</a>
        </div>
      </section>

      <section className={`${styles.container} ${styles.enterpriseLevels}`}>
        <div>
          <h2 className={styles.sectionTitle}>No suma otro beneficio. <span style={{ color: '#006d42' }}>Activa lo que ya tenés.</span></h2>
        </div>
        <p className={styles.sectionBody}>Las empresas ya invierten en bienestar, beneficios y comunicación. El desafío es lograr que las personas participen y lo sostengan. Pasito transforma esas iniciativas en objetivos simples, motivadores y medibles.</p>
        <div className={styles.enterpriseLevelsGrid}>
          <article><span>01</span><h3>La persona</h3><p>Más movimiento, más energía y mejores hábitos en una app que ya conoce.</p></article>
          <article><span>02</span><h3>El equipo</h3><p>Desafíos donde el resultado crece cuando participan más personas.</p></article>
          <article><span>03</span><h3>La organización</h3><p>Comunicaciones, capacitaciones y beneficios que se convierten en misiones con recompensa.</p></article>
        </div>
      </section>

      <section id="como-funciona" className={`${styles.container} ${styles.enterpriseHowItWorks}`}>
        <PhoneFan left="/marketing/device-cafecito.png" center="/marketing/device-home.png" right="/marketing/device-premios-list.png" prefix="Pasito Empresas" />
        <div>
          <h2 className={styles.sectionTitle}>Simple para cada persona. Claro para la organización.</h2>
          <ol className={styles.enterpriseSteps}>
            <li><span>1</span><p>Caminan, participan y completan misiones para sumar pasos.</p></li>
            <li><span>2</span><p>Los pasos se convierten en Pasitos para canjear beneficios y reconocimientos.</p></li>
            <li><span>3</span><p>RR.HH. acompaña la participación con desafíos, comunicaciones y tendencias de equipo.</p></li>
          </ol>
        </div>
      </section>

      <section className={`${styles.container} ${styles.enterpriseFeatures}`}>
        <h2 className={styles.sectionTitle}>Todo lo que activa a tu equipo, en una sola app.</h2>
        <div className={styles.enterpriseFeaturesGrid}>
          {FEATURES.map(({ icon: Icon, title, body, tone }) => (
            <article className={`${styles.enterpriseFeatureCard} ${styles[`enterpriseFeature${tone[0].toUpperCase()}${tone.slice(1)}`]}`} key={title}>
              <span className={styles.iconBox}><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.enterpriseMeasureSection}>
        <div className={`${styles.container} ${styles.enterpriseMeasureGrid}`}>
          <div className={styles.enterpriseMeasureIntro}>
            <div className={styles.enterpriseMeasureMark}><ChartNoAxesCombined size={25} /></div>
            <h2 className={styles.sectionTitle}>Menos intuición.<br /><span>Más señales.</span></h2>
            <p className={styles.sectionBody}>Una vista de equipo para detectar participación, entender qué iniciativas funcionan y reconocer los logros compartidos.</p>
          </div>
          <div className={styles.enterpriseMeasurements}>
            {MEASUREMENTS.map(([title, body]) => <article key={title}><span aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className={styles.enterprisePrivacySection}>
        <div className={`${styles.container} ${styles.enterprisePrivacy}`}>
          <div className={styles.enterprisePrivacyIntro}>
            <div className={styles.enterprisePrivacyIcon}><ShieldCheck size={30} /></div>
            <h2 className={styles.sectionTitle}>La empresa ve al equipo. Nunca invade a la persona.</h2>
            <p className={styles.sectionBody}>Pasito organiza el tratamiento de datos bajo los marcos de protección vigentes en Argentina y Uruguay. Antes de activar, dejamos por escrito qué se mide, para qué, quién accede y durante cuánto tiempo.</p>
            <a className={styles.enterprisePrivacyLink} href="/privacidad">Conocé nuestra política de privacidad <ArrowRight size={16} /></a>
          </div>

          <div className={styles.enterprisePrivacyCountries} aria-label="Marcos de protección de datos aplicables">
            <article className={`${styles.enterprisePrivacyCountry} ${styles.enterprisePrivacyArgentina}`}>
              <div className={styles.enterprisePrivacyCountryTop}><span className={styles.enterprisePrivacyCountryCode} aria-hidden="true">AR</span><span>Argentina</span></div>
              <h3>Ley 25.326</h3>
              <p>Protección de Datos Personales y Decreto Reglamentario 1558/2001.</p>
              <a href="https://www.argentina.gob.ar/aaip/buscador-normativa" target="_blank" rel="noreferrer">Ver normativa AAIP ↗</a>
            </article>
            <article className={`${styles.enterprisePrivacyCountry} ${styles.enterprisePrivacyUruguay}`}>
              <div className={styles.enterprisePrivacyCountryTop}><span className={styles.enterprisePrivacyCountryCode} aria-hidden="true">UY</span><span>Uruguay</span></div>
              <h3>Ley 18.331</h3>
              <p>Protección de Datos Personales y Acción de Habeas Data, reglamentada por el Decreto 414/009.</p>
              <a href="https://www.impo.com.uy/bases/decretos/414-2009/1" target="_blank" rel="noreferrer">Ver normativa URCDP ↗</a>
            </article>
          </div>

          <div className={styles.enterprisePrivacyPractices}>
            <article><EyeOff size={20} /><div><strong>Datos agregados</strong><span>La empresa recibe señales de equipo, no recorridos individuales.</span></div></article>
            <article><UserRoundCheck size={20} /><div><strong>Participación voluntaria</strong><span>Cada persona decide sumarse y conserva el control de sus datos.</span></div></article>
            <article><FileCheck2 size={20} /><div><strong>Reglas antes de activar</strong><span>Finalidad, accesos y tratamiento definidos con claridad.</span></div></article>
          </div>
        </div>
      </section>

      <div className={styles.enterpriseCommercialSection}>
        <section className={`${styles.container} ${styles.enterpriseComparison}`}>
          <div className={styles.enterpriseComparisonHeading}>
            <h2 className={styles.sectionTitle}>Estar disponible<br />no es lo mismo que <span>activar.</span></h2>
            <p>Los beneficios tradicionales esperan que alguien los use. Pasito crea una razón para participar, volver y sostener el hábito.</p>
          </div>
          <div className={styles.enterpriseComparisonGrid}>
            <article className={styles.enterpriseComparisonTraditional}>
              <span className={styles.enterpriseComparisonLabel}>Beneficios tradicionales</span>
              <strong>Disponible</strong>
              <p>Gimnasios, descuentos y propuestas valiosas para quienes ya decidieron usarlas.</p>
              <small>La oferta espera.</small>
            </article>
            <div className={styles.enterpriseComparisonArrow} aria-hidden="true"><ArrowRight size={25} /></div>
            <article className={styles.enterpriseComparisonPasito}>
              <span className={styles.enterpriseComparisonLabel}>Pasito Empresas</span>
              <strong>Parte del día</strong>
              <p>Movimiento, objetivos compartidos y recompensas que invitan a participar una y otra vez.</p>
              <small>La experiencia activa.</small>
            </article>
          </div>
        </section>

        <section className={`${styles.container} ${styles.enterprisePricing}`}>
          <div className={styles.enterprisePricingShell}>
            <div className={styles.enterprisePricingHeading}>
              <h2 className={styles.sectionTitle}>Pagás cuando<br /><span>la gente participa.</span></h2>
              <p>Un modelo simple, alineado con el resultado que realmente importa: que el equipo se active.</p>
            </div>
            <div className={styles.enterprisePricingCards}>
              <article className={styles.enterprisePricingPlatform}>
                <span>Plataforma</span>
                <strong><small>USD</small> 3</strong>
                <b>por persona activa / mes</b>
                <p>Si una persona no participa ese mes, no se cobra. 500 personas activas equivalen a USD 1.500 por mes.</p>
              </article>
              <article className={styles.enterprisePricingSetup}>
                <span>Implementación</span>
                <strong><small>ARS</small> 500.000</strong>
                <b>pago único de setup</b>
                <p>Onboarding, configuración inicial y acompañamiento para lanzar con claridad.</p>
              </article>
            </div>
            <div className={styles.enterprisePricingAction}>
              <div><Sparkles size={22} /><p><strong>Dos meses bonificados</strong><span>con pago anual · valores sin IVA</span></p></div>
              <a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={ENTERPRISE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Hablemos de tu equipo <ArrowRight size={18} /></a>
            </div>
          </div>
        </section>
      </div>

      <section className={`${styles.container} ${styles.faqSection}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Preguntas frecuentes</h2>
        <div className={styles.faqGrid}>{FAQS.map(([question, answer]) => <article key={question}><h3 className={styles.faqQuestion}>{question}</h3><p className={styles.faqAnswer}>{answer}</p></article>)}</div>
      </section>

      <section className={`${styles.container} ${styles.enterpriseSources}`}>
        <h2>Fuentes que respaldan esta propuesta</h2>
        <p>Usamos datos de salud y engagement como contexto. No son una garantía de resultados para cada empresa.</p>
        <div>
          <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noreferrer">01 · OMS — Actividad física ↗</a>
          <a href="https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work" target="_blank" rel="noreferrer">02 · OMS — Salud mental en el trabajo ↗</a>
          <a href="https://www.gallup.com/workplace/321725/gallup-q12-meta-analysis-report.aspx" target="_blank" rel="noreferrer">03 · Gallup — Q12 Meta-Analysis ↗</a>
        </div>
      </section>

      <section className={`${styles.container} ${styles.finalWrap}`}>
        <div className={styles.finalCta}>
          <span className={styles.orbOne} aria-hidden="true" /><span className={styles.orbTwo} aria-hidden="true" />
          <h2 className={styles.finalTitle}>Todo listo para <span className={styles.accent}>activar.</span></h2>
          <p className={styles.finalText}>Plataforma completa, onboarding acompañado y un primer desafío con el que tu equipo realmente quiera empezar.</p>
          <div className={styles.enterpriseFinalPills}><span>Plataforma completa</span><span>Onboarding acompañado</span><span>Reportes desde el primer día</span></div>
          <div className={styles.finalActions}><a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={ENTERPRISE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Activemos tu organización <ArrowRight size={18} /></a></div>
        </div>
      </section>

      <MarketingFooter enterprise />
    </main>
  )
}
