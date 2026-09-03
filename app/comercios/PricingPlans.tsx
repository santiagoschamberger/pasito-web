'use client'

import { useState } from 'react'

import styles from '../marketing.module.css'
import { CheckIcon, PARTNERS_REGISTER_URL } from '@/components/marketing/Marketing'
import {
  formatPaidPlanPrice,
  formatPartnerPlanListAmount,
  getPartnerPlanChargeAmount,
  type PartnerBillingCountryCode,
  type PartnerPlanCurrency,
} from '@/lib/partner-plan-pricing'

type Country = 'argentina' | 'uruguay'

const PRICE_BY_COUNTRY: Record<Country, {
  countryCode: PartnerBillingCountryCode
  currency: PartnerPlanCurrency
  ventas: number
  destacado: number
  description: string
}> = {
  argentina: {
    countryCode: 'AR',
    currency: 'ARS',
    ventas: 69_000,
    destacado: 190_000,
    description: 'Precios mensuales en pesos argentinos',
  },
  uruguay: {
    countryCode: 'UY',
    currency: 'USD',
    ventas: 50,
    destacado: 150,
    description: 'Precios mensuales en dólares estadounidenses',
  },
}

const PLANS = [
  {
    name: 'Gratis',
    priceKey: 'starter' as const,
    lead: 'Empezá a recibir nuevas visitas, sin costo mensual.',
    features: [
      <>Aparecés en el mapa de Pasito</>,
      <>Para mantener activo el plan, ofrecé al menos un premio 100% gratuito —sin compra adicional— con un cupo disponible de 5 canjes por día</>,
      <>Por cada premio activo, podés sumar hasta 2 descuentos</>,
    ],
    action: 'Empezá gratis',
  },
  {
    name: 'Standard',
    priceKey: 'ventas' as const,
    lead: 'Más libertad para convertir visitas en ventas.',
    featured: true,
    features: [
      <>Elegís si querés ofrecer premios 100% gratuitos</>,
      <>Publicá todos los descuentos que quieras</>,
      <>Creá comunidad con sellos e insignias que los usuarios obtienen al canjear en tu comercio</>,
      <>Aparecés en el mapa de Pasito</>,
    ],
    action: 'Activar Standard',
  },
  {
    name: 'Destacado',
    priceKey: 'destacado' as const,
    lead: 'Más visibilidad para ser una de las primeras opciones de tu zona.',
    extra: 'Todo lo incluido en Standard, más:',
    features: [
      <>Posicionamiento prioritario en los primeros puestos de tu categoría</>,
      <>Pin destacado con la foto de tu marca</>,
      <>3 notificaciones push por mes a una audiencia de 5.000 usuarios de tu zona</>,
      <>Soporte 24/7</>,
    ],
    action: 'Quiero destacarme',
  },
]

const TABLE_ROWS = [
  ['Ideal para', 'Darse a conocer', 'Vender y fidelizar', 'Dominar tu zona'],
  ['Aparece en el mapa', '✓', '✓', '⭐ Destacado'],
  ['Premios 100% gratuitos', '1 activo (mín. 5/día)', 'Opcional', 'Opcional'],
  ['Descuentos', 'Hasta 2 por premio activo', 'Sin límite', 'Sin límite'],
  ['Sellos e insignias', '—', '✓', '✓'],
  ['Primeros puestos de la categoría', '—', '—', '✓'],
  ['Pin con foto de marca', '—', '—', '✓'],
  ['Notificaciones push', '—', '—', '3/mes a 5.000 usuarios'],
  ['Soporte 24/7', '—', '—', '✓'],
]

export function PricingPlans() {
  const [country, setCountry] = useState<Country>('argentina')
  const prices = PRICE_BY_COUNTRY[country]
  const priceFor = (priceKey: (typeof PLANS)[number]['priceKey']) => (
    priceKey === 'starter' ? 'Gratis' : formatPartnerPlanListAmount(prices[priceKey], prices.currency)
  )
  const paidPriceSuffix = (listAmount: number) => {
    const total = getPartnerPlanChargeAmount(listAmount, prices.countryCode)
    return (
      <span className={styles.perMonth}>
        /mes + IVA (total {formatPartnerPlanListAmount(total, prices.currency)})
      </span>
    )
  }
  const priceRow = [
    'Precio',
    'Gratis',
    formatPaidPlanPrice(prices.ventas, prices.countryCode),
    formatPaidPlanPrice(prices.destacado, prices.countryCode),
  ]

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
              {plan.priceKey !== 'starter' && paidPriceSuffix(prices[plan.priceKey])}
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
            <thead><tr><th /><th>Gratis</th><th>Standard</th><th>Destacado</th></tr></thead>
            <tbody>{[priceRow, ...TABLE_ROWS].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </>
  )
}
