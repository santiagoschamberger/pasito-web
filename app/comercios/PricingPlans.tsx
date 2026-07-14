'use client'

import { useState } from 'react'

import styles from '../marketing.module.css'
import { CheckIcon, PARTNERS_REGISTER_URL } from '@/components/marketing/Marketing'

type Country = 'argentina' | 'uruguay'

const PRICE_BY_COUNTRY: Record<Country, { ventas: string; destacado: string; description: string }> = {
  argentina: {
    ventas: '$69.000',
    destacado: '$190.000',
    description: 'Precios mensuales en pesos argentinos',
  },
  uruguay: {
    ventas: 'USD 50',
    destacado: 'USD 150',
    description: 'Precios mensuales en dólares estadounidenses',
  },
}

const PLANS = [
  {
    name: 'Starter',
    priceKey: 'starter' as const,
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
    priceKey: 'ventas' as const,
    lead: 'Convertí las visitas en ventas.',
    extra: 'Todo lo de Starter, más:',
    featured: true,
    features: [
      <><strong>Beneficios que cuidan tu margen:</strong> ofrecé descuentos y premios con compra adicional, sin necesidad de bonificar productos completos</>,
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
    priceKey: 'destacado' as const,
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

export function PricingPlans() {
  const [country, setCountry] = useState<Country>('argentina')
  const prices = PRICE_BY_COUNTRY[country]
  const priceFor = (priceKey: (typeof PLANS)[number]['priceKey']) => (
    priceKey === 'starter' ? 'Gratis' : prices[priceKey]
  )
  const priceRow = ['Precio', 'Gratis', `${prices.ventas}/mes`, `${prices.destacado}/mes`]

  return (
    <>
      <div className={styles.pricingCountryControl}>
        <span className={styles.pricingCountryLabel}>Ver precios para</span>
        <div className={styles.pricingCountrySwitch} role="group" aria-label="País para ver precios">
          <button
            type="button"
            className={country === 'argentina' ? styles.pricingCountryActive : ''}
            aria-pressed={country === 'argentina'}
            onClick={() => setCountry('argentina')}
          >
            Argentina
          </button>
          <button
            type="button"
            className={country === 'uruguay' ? styles.pricingCountryActive : ''}
            aria-pressed={country === 'uruguay'}
            onClick={() => setCountry('uruguay')}
          >
            Uruguay
          </button>
        </div>
        <span className={styles.pricingCurrencyNote}>{prices.description}</span>
      </div>

      <div className={styles.plansGrid}>
        {PLANS.map((plan) => (
          <article className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`} key={plan.name}>
            {plan.featured && <span className={`${styles.overline} ${styles.planBadge}`}>El más elegido</span>}
            <span className={styles.overline} style={{ color: plan.featured ? 'rgba(255,255,255,.65)' : '#7c7c65' }}>{plan.name}</span>
            <div className={styles.planPrice} aria-live="polite" aria-atomic="true">
              {priceFor(plan.priceKey)}
              {plan.priceKey !== 'starter' && <span className={styles.perMonth}>/mes</span>}
            </div>
            <p className={styles.planLead}>{plan.lead}</p>
            {plan.extra && <p className={styles.planExtra}>{plan.extra}</p>}
            <div className={styles.planFeatures}>
              {plan.features.map((feature, index) => <div className={styles.planFeature} key={index}><CheckIcon size={17} /><span>{feature}</span></div>)}
            </div>
            <a className={styles.planAction} href={PARTNERS_REGISTER_URL} target="_blank" rel="noopener noreferrer">{plan.action}</a>
          </article>
        ))}
      </div>
      <p className={styles.plansNote}>Sin permanencia. Cambiás de plan cuando quieras.</p>

      <details className={styles.compareDetails}>
        <summary><span className={styles.compareSummaryTitle}>Comparación completa</span><span className={styles.compareLabel} /></summary>
        <div className={styles.tableWrap}>
          <table className={styles.compareTable}>
            <thead><tr><th /><th>Starter</th><th>Ventas</th><th>Destacado</th></tr></thead>
            <tbody>{[priceRow, ...TABLE_ROWS].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </>
  )
}
