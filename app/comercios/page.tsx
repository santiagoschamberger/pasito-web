import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, Flame, Settings2, Users } from 'lucide-react'

import styles from '../marketing.module.css'
import {
  BrandRow,
  CheckIcon,
  FinalCta,
  MarketingFooter,
  MarketingNav,
  NumberedOverline,
  PhoneFan,
  RulesList,
  StatsBand,
  PARTNERS_URL,
} from '@/components/marketing/Marketing'
import { MarketingMotion } from '@/components/marketing/MarketingMotion'
import { formatRoundedMarketingMetric, getMarketingMetrics } from '@/lib/marketing-metrics'

export const metadata: Metadata = {
  title: 'Pasito para comercios — Convertimos movimiento en clientes',
  description: 'Una plataforma de visibilidad para dar a conocer tu comercio y conectarlo con personas activas que buscan experiencias reales.',
  openGraph: {
    title: 'Pasito para comercios — Convertimos movimiento en clientes',
    description: 'Una plataforma de visibilidad para dar a conocer tu comercio y conectarlo con personas activas que buscan experiencias reales.',
    type: 'website',
  },
}

const PLANS = [
  {
    name: 'Starter',
    price: 'Gratis',
    lead: 'Conseguí nuevos clientes sin costo.',
    features: [
      <>Aparecés en el mapa de Pasito</>,
      <><strong>Único requisito:</strong> publicás un premio gratuito con mínimo 5 canjes por día para los usuarios</>,
      <>Podés sumar descuentos</>,
    ],
    action: 'Empezá gratis',
  },
  {
    name: 'Ventas',
    price: '$69.000',
    period: '/mes',
    lead: 'Convertí las visitas en ventas.',
    extra: 'Todo lo de Starter, más:',
    featured: true,
    features: [
      <><strong>No regalás nada:</strong> podés trabajar solo con descuentos y premios con compra extra</>,
      <>Sellos e insignias de tu local</>,
      <>Recompensas por visitas recurrentes</>,
      <>Configuración avanzada de beneficios</>,
      <>Próximamente: Club del comercio, tu programa de fidelización</>,
      <>Próximamente: campañas y notificaciones segmentadas</>,
    ],
    action: 'Activar Ventas',
  },
  {
    name: 'Destacado',
    price: '$190.000',
    period: '/mes',
    lead: 'Sé la primera opción de tu zona.',
    extra: 'Todo lo de Ventas, más:',
    features: [
      <>Pin destacado en el mapa</>,
      <>Aparecés primero en las búsquedas</>,
      <>Branding destacado de tu comercio</>,
    ],
    action: 'Quiero destacarme',
  },
]

const TABLE_ROWS = [
  ['Precio', 'Gratis', '$69.000/mes', '$190.000/mes'],
  ['Ideal para', 'Darse a conocer', 'Vender y fidelizar', 'Dominar tu zona'],
  ['Aparece en el mapa', '✓', '✓', '⭐ Destacado'],
  ['Premios gratuitos', '✓ (mín. 5/día)', 'Opcional', 'Opcional'],
  ['Descuentos', '✓', '✓', '✓'],
  ['Premios con compra', '—', '✓', '✓'],
  ['Sellos e insignias', '—', '✓', '✓'],
  ['Recompensas por visitas recurrentes', '—', '✓', '✓'],
  ['Configuración avanzada', '—', '✓', '✓'],
  ['Pin destacado en el mapa', '—', '—', '✓'],
  ['Primero en búsquedas', '—', '—', '✓'],
  ['Branding destacado', '—', '—', '✓'],
  ['Club del comercio (próximamente)', '—', '✓', '✓'],
  ['Campañas segmentadas (próximamente)', '—', '✓', '✓'],
]

const RULES = [
  'El canje es presencial y se valida con tu código.',
  'Vos definís el cupo diario, los horarios y las sucursales.',
  'Un usuario puede canjear en tu local una vez cada 15 días.',
  'Nadie está obligado a comprar algo extra (aunque 5 de cada 10 lo hacen).',
  'Si el usuario tiene mala conducta, lo eliminamos de la plataforma.',
  'Todo queda registrado en tu panel de partner.',
  'Te reservás el derecho de admisión.',
]

const FAQS = [
  { q: '¿Cuánto cuesta el plan Starter?', a: 'Nada. Tu única inversión es el premio que entregás cuando alguien llega de verdad a tu local.' },
  { q: '¿Qué puedo ofrecer como premio?', a: 'Un producto, un servicio, una clase o una experiencia. Lo que mejor represente a tu comercio.' },
  { q: '¿Estoy obligado a regalar producto?', a: 'Solo en Starter. En Ventas y Destacado podés trabajar únicamente con descuentos y premios con compra. Y no es regalar, es invertir para que alguien entre a tu local y pruebe tu producto.' },
  { q: '¿Cómo valido un canje?', a: 'Con un código fijo de 4 números que te asigna Pasito. Si trabajás con cupones propios, podés cargar tus códigos y validarlos en tu sistema.' },
  { q: '¿Puedo limitar cuántos canjes recibo?', a: 'Sí. Definís un cupo diario (mínimo 5 en Starter), los días, horarios y sucursales.' },
  { q: '¿Cómo cobro la compra adicional?', a: 'Como siempre: con tus medios de pago habituales. Pasito no interviene ni cobra comisión sobre esa venta.' },
  { q: '¿Qué es el Club del comercio?', a: 'Próximamente. Será tu propio programa de fidelización dentro de Pasito: sellos, insignias y recompensas para que tus clientes vuelvan.' },
  { q: '¿Hay permanencia?', a: 'No. Cambiás de plan o te das de baja cuando quieras.' },
]

export default async function ComerciosPage() {
  const metrics = await getMarketingMetrics()
  const stats = [
    { value: formatRoundedMarketingMetric(metrics.totalUsers, 10_000), label: 'usuarios' },
    { value: '+800', label: 'comercios activos' },
    { value: formatRoundedMarketingMetric(metrics.newUsersLast24Hours, 1_000), label: 'usuarios nuevos por día' },
    { value: '+15M', label: 'impresiones por mes' },
  ]

  return (
    <main className={styles.page} data-marketing-page>
      <MarketingMotion />
      <MarketingNav active="comercios" />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={`${styles.heroTitle} ${styles.heroTitleCommerce}`}>Convertimos el<br /><span className={styles.accent}>movimiento</span> en<br /><span className={styles.commerceTitleLine}><span className={styles.accent}>clientes</span> para tu local.</span></h1>
            <p className={`${styles.heroText} ${styles.heroTextCommerce}`}><span className={styles.commerceTextLine}>Una nueva plataforma de visibilidad para dar a conocer tu comercio</span><span className={styles.commerceTextLine}> y conectarlo con personas activas que buscan experiencias reales.</span></p>
            <div className={styles.heroButtons}>
              <a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={PARTNERS_URL} target="_blank" rel="noopener noreferrer">Sumá tu comercio <ArrowRight size={18} /></a>
              <a className={styles.outlineButton} href="#planes">Ver planes</a>
            </div>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.heroTilt} data-hero-tilt>
              <Image className={styles.heroPhone} src="/marketing/comercios-hero.png" alt="App Pasito: detalle de comercio con premios" width={2088} height={4320} sizes="(max-width: 640px) 86vw, 420px" priority unoptimized />
            </div>
          </div>
        </div>
        <StatsBand stats={stats} />
      </header>

      <section className={`${styles.container} ${styles.twoCol}`}>
        <PhoneFan
          left="/marketing/device-servicios.png"
          center="/marketing/device-premios.png"
          right="/marketing/device-experiencias.png"
          prefix="Pasito para comercios"
        />
        <div>
          <span className={styles.overline}>Qué es Pasito</span>
          <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>La app que recompensa a las personas por caminar.</h2>
          <p className={styles.sectionBody}>Cada día convierten sus pasos en Pasitos para descubrir comercios, canjear productos y vivir experiencias. Para tu comercio, es un canal de visibilidad con personas que llegan hasta tu local para conocerlo.</p>
        </div>
      </section>

      <section className={`${styles.container} ${styles.socialProof}`}>
        <h2 className={styles.socialTitle}>Marcas que confían en nosotros</h2>
        <BrandRow light />
      </section>

      <section className={`${styles.container} ${styles.benefits}`}>
        <NumberedOverline number="01">Por qué sumarte</NumberedOverline>
        <h2 className={`${styles.sectionTitle} ${styles.benefitsTitle}`}>No comprás visibilidad. <span style={{ color: '#006d42' }}>Recibís visitas.</span></h2>
        <div className={styles.benefitGrid}>
          <article className={`${styles.benefitCard} ${styles.benefitStat}`}>
            <span className={`${styles.overline} ${styles.accent}`}>Compra extra</span>
            <div>
              <div className={styles.bigMetric}>5<small>/10</small></div>
              <h3>canjes traen una compra extra.</h3>
              <p>El premio los acerca. Tu producto hace el resto. Esa venta la cobrás vos, con tus medios de siempre.</p>
            </div>
          </article>
          <article className={`${styles.benefitCard} ${styles.benefitWide}`}>
            <span className={styles.iconBox}><Users size={25} /></span>
            <h3>Personas reales, no impresiones.</h3>
            <p>Cada canje es alguien parado en tu local. Con nombre, con intención y con tiempo para conocerte.</p>
          </article>
          <article className={`${styles.benefitCard} ${styles.benefitSmall}`}>
            <span className={styles.iconBox}><Settings2 size={22} /></span>
            <h3>El control es tuyo.</h3>
            <div className={styles.chips}>{['Cupo diario', 'Horarios', 'Sucursales', 'Condiciones'].map((chip) => <span className={styles.chip} key={chip}>{chip}</span>)}</div>
          </article>
          <article className={`${styles.benefitCard} ${styles.benefitPink}`}>
            <span className={styles.iconBox}><Flame size={22} /></span>
            <h3>Clientes que vuelven.</h3>
            <p>Recompensas por visitas recurrentes y, próximamente, el Club de tu comercio: la primera visita se hace costumbre.</p>
          </article>
        </div>
      </section>

      <section className={styles.comparisonSection}>
        <div className={`${styles.container} ${styles.darkInner}`}>
          <NumberedOverline number="02" light>La cuenta es simple</NumberedOverline>
          <h2 className={styles.sectionTitle}>Los mismos <span className={styles.accent}>$500.000</span>, tres destinos muy distintos.</h2>
          <div className={styles.comparisonGrid}>
            <article className={styles.comparisonCard}>
              <span className={styles.overline} style={{ color: 'rgba(255,255,255,.6)' }}>Publicidad en redes</span>
              <strong className={styles.comparisonMetric}>~500 clics</strong>
              <p>$100 por clic. Y un clic no es una persona en tu local: la mayoría nunca llega.</p>
              <span className={styles.comparisonFoot}>Visitas: inciertas</span>
            </article>
            <article className={`${styles.comparisonCard} ${styles.comparisonPink}`}>
              <span className={styles.overline} style={{ color: 'rgba(64,2,36,.6)' }}>Vía pública</span>
              <strong className={styles.comparisonMetric}>1 cartel</strong>
              <p>Pocos días de miradas al pasar. Imposible saber cuántas se convirtieron en clientes.</p>
              <span className={styles.comparisonFoot}>Visitas: imposibles de medir</span>
            </article>
            <article className={`${styles.comparisonCard} ${styles.comparisonPasito}`}>
              <span className={styles.comparisonBadge}>Con Pasito</span>
              <span className={styles.overline} style={{ color: 'rgba(0,64,39,.6)' }}>Clientes en tu local</span>
              <strong className={styles.comparisonMetric}>Visitas reales</strong>
              <p>Personas paradas en tu mostrador, medibles una por una en tu panel.</p>
              <span className={styles.comparisonFoot}><span className={styles.comparisonPill}>5/10 compran algo más</span></span>
            </article>
          </div>
          <p className={styles.comparisonNote}>¿Y si arrancás con Starter? Costo fijo $0: tu única inversión es el premio, y solo cuando la visita llega.</p>
        </div>
      </section>

      <section id="planes" className={`${styles.container} ${styles.plans}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Tres formas de crecer con Pasito.</h2>
        <p className={styles.faqAnswer}>Empezá gratis. Escalá cuando quieras.</p>
        <div className={styles.plansGrid}>
          {PLANS.map((plan) => (
            <article className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`} key={plan.name}>
              {plan.featured && <span className={`${styles.overline} ${styles.planBadge}`}>El más elegido</span>}
              <span className={styles.overline} style={{ color: plan.featured ? 'rgba(255,255,255,.65)' : '#7c7c65' }}>{plan.name}</span>
              <div className={styles.planPrice}>{plan.price}{plan.period && <span className={styles.perMonth}>{plan.period}</span>}</div>
              <p className={styles.planLead}>{plan.lead}</p>
              {plan.extra && <p className={styles.planExtra}>{plan.extra}</p>}
              <div className={styles.planFeatures}>
                {plan.features.map((feature, index) => <div className={styles.planFeature} key={index}><CheckIcon size={17} /><span>{feature}</span></div>)}
              </div>
              <a className={styles.planAction} href={PARTNERS_URL} target="_blank" rel="noopener noreferrer">{plan.action}</a>
            </article>
          ))}
        </div>
        <p className={styles.plansNote}>Sin permanencia. Cambiás de plan cuando quieras.</p>
      </section>

      <details className={`${styles.container} ${styles.compareDetails}`}>
        <summary><span className={styles.compareSummaryTitle}>Comparación completa</span><span className={styles.compareLabel} /></summary>
        <div className={styles.tableWrap}>
          <table className={styles.compareTable}>
            <thead><tr><th /><th>Starter</th><th>Ventas</th><th>Destacado</th></tr></thead>
            <tbody>{TABLE_ROWS.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>

      <section className={`${styles.container} ${styles.twoCol} ${styles.rules}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Reglas simples.<br />Sin letra chica.</h2>
        <RulesList rules={RULES} />
      </section>

      <section className={`${styles.container} ${styles.faqSection}`}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleSmall}`}>Preguntas frecuentes</h2>
        <div className={styles.faqGrid}>
          {FAQS.map((faq) => <article key={faq.q}><h3 className={styles.faqQuestion}>{faq.q}</h3><p className={styles.faqAnswer}>{faq.a}</p></article>)}
        </div>
      </section>

      <FinalCta commerce />
      <MarketingFooter commerce />
    </main>
  )
}
