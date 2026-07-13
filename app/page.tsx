import type { Metadata } from 'next'
import Image from 'next/image'

import styles from './marketing.module.css'
import {
  BrandRow,
  FinalCta,
  MarketingFooter,
  MarketingNav,
  NumberedOverline,
  RulesList,
  StatsBand,
  StoreButtons,
} from '@/components/marketing/Marketing'
import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import { formatRoundedMarketingMetric, getMarketingMetrics } from '@/lib/marketing-metrics'

export const metadata: Metadata = {
  title: 'Pasito — Moverte cambia todo.',
  description: 'Pasito te da una razón para salir de casa todos los días: caminás, descubrís tu ciudad y cada paso suma.',
  openGraph: {
    title: 'Pasito — Moverte cambia todo.',
    description: 'Pasito te da una razón para salir de casa todos los días: caminás, descubrís tu ciudad y cada paso suma.',
    type: 'website',
  },
}

const STEPS = [
  { title: 'Salí a moverte.', body: 'La app cuenta tus pasos automáticamente desde tu teléfono.' },
  { title: 'Ganá Pasitos.', body: 'Tu movimiento se convierte en moneda.' },
  { title: 'Abrí el mapa.', body: 'Descubrí cafés, clases y experiencias cerca tuyo que no conocías.' },
  { title: 'Canjeá y disfrutá.', body: 'Cada canje es una excusa para conocer un lugar nuevo.' },
  { title: 'Sumate a desafíos.', body: 'Miles de personas moviéndose juntas. La constancia en grupo es más fácil.' },
]

const HEALTH_BENEFITS = [
  {
    tag: '7.000 pasos',
    title: 'Vivís más.',
    body: 'Dar alrededor de 7.000 pasos por día se asoció con un 50–70% menos de riesgo de mortalidad frente a una vida más sedentaria.',
    source: 'JAMA Network Open, 2021',
    href: 'https://pubmed.ncbi.nlm.nih.gov/34477847/',
  },
  {
    tag: '2,5 horas',
    title: 'Tu cabeza lo nota.',
    body: 'Caminar a paso ligero unas 2,5 horas por semana se asocia con un 25% menos de riesgo de depresión.',
    source: 'JAMA Psychiatry, 2022',
    href: 'https://pubmed.ncbi.nlm.nih.gov/35416941/',
  },
  {
    tag: '30 minutos',
    title: 'Tu corazón también.',
    body: '30 minutos de caminata diaria ayudan a reducir el riesgo de enfermedad cardiovascular y a controlar presión, peso y glucosa.',
    source: 'Organización Mundial de la Salud',
    href: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    tag: '150 min/semana',
    title: 'Y no hace falta ser atleta.',
    body: 'La OMS recomienda 150 minutos de actividad moderada por semana. Caminar cuenta. Pasear al perro cuenta. Bajarte una parada antes cuenta.',
    source: 'OMS, actividad física',
    href: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
]

const RULES = [
  'Tus pasos se convierten en Pasitos automáticamente. No tenés que hacer nada.',
  'Los premios son 100% canjeables: nadie te obliga a comprar algo extra.',
  'El canje es presencial: lo confirmás en el local, en el momento.',
  'Podés canjear en el mismo local una vez cada 15 días.',
  'Cada local define su cupo diario: si dice “sin stock por hoy”, mañana hay más.',
  'Las capturas de pantalla no valen como canje. La magia pasa en vivo.',
]

const FAQS = [
  { q: '¿Cuánto cuesta?', a: 'Nada. Pasito es y va a ser gratis para las personas.' },
  { q: '¿Cómo cuenta mis pasos?', a: 'Se conecta con Apple Salud o Google Health Connect y suma tus pasos automáticamente, sin gastar batería de más.' },
  { q: '¿Qué puedo canjear?', a: 'Cafés, comidas, clases, experiencias, descuentos y productos en +800 lugares. Cada canje es una excusa para salir y conocer algo nuevo.' },
  { q: '¿Tengo que comprar algo para canjear?', a: 'No. Los premios se canjean solo con Pasitos. Si querés sumar algo más, eso lo pagás como siempre.' },
  { q: '¿Vale caminar en cualquier lado?', a: 'Sí. En la calle, en la cinta, en el shopping. Si te movés, cuenta.' },
]

export default async function HomePage() {
  const metrics = await getMarketingMetrics()
  const totalUsers = formatRoundedMarketingMetric(metrics.totalUsers, 10_000)
  const newUsersPerDay = formatRoundedMarketingMetric(metrics.newUsersLast24Hours, 1_000)
  const stats = [
    { value: totalUsers, label: 'personas ya caminan con Pasito' },
    { value: '388.000', label: 'usuarios activos diarios' },
    { value: formatRoundedMarketingMetric(metrics.totalPartners, 100), label: 'comercios para descubrir' },
    { value: 'App #1', label: 'en Argentina y Uruguay' },
  ]

  return (
    <main className={styles.page} data-marketing-page>
      <MarketingMotion />
      <MarketingNav />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.heroTitle}>Caminando pasan <span className={styles.accent}>cosas lindas.</span></h1>
            <p className={styles.heroText}>Pasito te da una razón para salir de casa todos los días: caminás, descubrís tu ciudad, vivís experiencias. Y de paso, cada paso suma.</p>
            <StoreButtons />
            <p className={styles.heroNote}>Gratis, para siempre. Sin tarjeta, sin trampas.</p>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.heroTilt} data-hero-tilt>
              <Image className={styles.heroPhone} src="/marketing/hero-share.png" alt="App Pasito: hoy hiciste 10.423 pasos" width={1392} height={2880} sizes="(max-width: 640px) 86vw, 420px" priority unoptimized />
            </div>
          </div>
        </div>
        <StatsBand stats={stats} />
      </header>

      <section className={styles.manifestoSection}>
        <div className={`${styles.container} ${styles.manifesto}`}>
          <p className={styles.manifestoLead}>No se trata de los premios.</p>
          <p className={styles.manifestoBody}>Se trata de lo que pasa cuando salís: el aire, el barrio, la cabeza que se despeja, el café que no conocías, la gente que camina con vos.</p>
          <div className={styles.manifestoStack}>
            <span>Los premios son la excusa.</span>
            <span>El hábito es el premio.</span>
          </div>
          <p className={styles.manifestoClose}>Salí. Hacé que pase. <span className={styles.highlight}>La ciudad es toda tuya.</span></p>
        </div>
      </section>

      <section className={`${styles.container} ${styles.healthSection}`}>
        <div className={styles.healthHeading}>
          <div>
            <NumberedOverline number="01">Por qué caminar</NumberedOverline>
            <h2 className={styles.sectionTitle}>Caminar es el hábito más subestimado del mundo.</h2>
          </div>
          <p>El problema nunca fue saber que caminar hace bien. Es empezar — y sostenerlo. Para eso existe Pasito.</p>
        </div>
        <div className={styles.healthGrid}>
          {HEALTH_BENEFITS.map((benefit) => (
            <article className={styles.healthCard} key={benefit.title}>
              <span>{benefit.tag}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
              <a href={benefit.href} target="_blank" rel="noreferrer">Fuente: {benefit.source}</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.warmSection}>
        <div className={`${styles.container} ${styles.warmInner}`}>
          <NumberedOverline number="02">Cómo funciona</NumberedOverline>
          <h2 className={styles.sectionTitle}>Así de simple.</h2>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, index) => (
              <article className={`${styles.stepCard} ${index === STEPS.length - 1 ? styles.stepCardDark : ''}`} key={step.title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.twoCol}`}>
        <div>
          <NumberedOverline number="03">Dónde estamos</NumberedOverline>
          <h2 className={styles.sectionTitle}>Ya estamos en 2 países. Y recién empezamos.</h2>
          <p className={styles.sectionBody}>Fuerte en CABA, Gran Buenos Aires y Montevideo, creciendo en Córdoba, Santa Fe y más ciudades. {newUsersPerDay} personas nuevas se suman cada día.</p>
        </div>
        <div className={styles.cityCloud}>
          {['CABA', 'GBA', 'Montevideo'].map((city) => <span className={styles.city} key={city}>{city}</span>)}
          {['Córdoba', 'Santa Fe', 'Canelones'].map((city) => <span className={`${styles.city} ${styles.cityNext}`} key={city}>{city}</span>)}
          <span className={`${styles.city} ${styles.citySoon}`}>tu ciudad, pronto</span>
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={`${styles.container} ${styles.darkInner} ${styles.centered}`}>
          <NumberedOverline number="04" light>Desafíos</NumberedOverline>
          <h2 className={`${styles.sectionTitle} ${styles.homeChallengeTitle}`}>Moverse en grupo es otra cosa.</h2>
          <p className={`${styles.sectionBody} ${styles.centeredBody}`}>Cada semana hay desafíos donde miles de personas caminan por un mismo objetivo, con premios de marcas como Disney, Decathlon, KFC y Wendy&apos;s. No competís contra otros: te sumás a una ola.</p>
          <p className={styles.challengeStat}>El 47% de los usuarios aumentó su actividad física desde que tiene Pasito.</p>
          <BrandRow />
        </div>
      </section>

      <section className={`${styles.container} ${styles.twoCol} ${styles.rules}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Reglas claras,<br />premios reales.</h2>
        <RulesList rules={RULES} />
      </section>

      <section className={`${styles.container} ${styles.faqSection}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Preguntas frecuentes</h2>
        <div className={styles.faqGrid}>
          {FAQS.map((faq) => (
            <article key={faq.q}>
              <h3 className={styles.faqQuestion}>{faq.q}</h3>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      <FinalCta title={<>Salí a caminar. Tu ciudad hace el resto.</>} storePrompt="Descargá Pasito gratis" />
      <MarketingFooter />
    </main>
  )
}
