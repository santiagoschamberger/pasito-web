'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarDays,
  Copy,
  Eye,
  Layers3,
  MousePointerClick,
  WalletCards,
} from 'lucide-react'

import {
  BANNER_PRICE_VALID_UNTIL,
  BANNER_MARKETS,
  BANNER_PLACEMENTS,
  BANNER_PRIORITIES,
  calculateBannerPricing,
  getBannerMarket,
  getBannerPlacement,
  getBannerPlacementCpm,
  getBannerPriority,
  type BannerMarketId,
  type BannerPlacementId,
  type BannerPriorityId,
} from '@/lib/banner-campaign-pricing'

import styles from './calculator.module.css'

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number, currency: 'ARS' | 'USD', maximumFractionDigits = 0) {
  const formatted = new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'es-UY', {
    maximumFractionDigits,
  }).format(value)

  return currency === 'ARS' ? `$ ${formatted}` : `USD ${formatted}`
}

function formatUplift(multiplier: number) {
  return multiplier === 1 ? 'Base' : `+${Math.round((multiplier - 1) * 100)}%`
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M`
  }
  if (value >= 1_000) {
    return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value / 1_000)} mil`
  }
  return formatInteger(value)
}

type BannerCalculatorProps = {
  placementId: BannerPlacementId
  onPlacementChange: (placementId: BannerPlacementId) => void
}

export function BannerCalculator({ placementId, onPlacementChange }: BannerCalculatorProps) {
  const [priorityId, setPriorityId] = useState<BannerPriorityId>('rotation')
  const [marketId, setMarketId] = useState<BannerMarketId>('AR')
  const [durationDays, setDurationDays] = useState(7)
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => calculateBannerPricing({
    marketId,
    placementId,
    priorityId,
    durationDays,
  }), [durationDays, marketId, placementId, priorityId])

  const placement = getBannerPlacement(placementId)
  const priority = getBannerPriority(priorityId)
  const market = getBannerMarket(marketId)

  const quoteSummary = useMemo(() => {
    return [
      'Hola, quiero consultar disponibilidad para una campaña de banners en Pasito.',
      '',
      `Superficie: ${placement.label}`,
      `Mercado: ${market.label}`,
      `Modalidad: ${priority.label}`,
      `Duración: ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`,
      `Vigencia de precios: hasta el ${BANNER_PRICE_VALID_UNTIL}`,
      `Inversión estimada: ${formatCurrency(result.investment, result.currency)}`,
      `Impresiones estimadas: ${formatInteger(result.impressions)}`,
      `Impresiones por día: ${formatInteger(result.dailyImpressions)}`,
      `CPM efectivo: ${formatCurrency(result.effectiveCpm, result.currency, 2)}`,
      `Factor de clicks por prioridad: ${formatUplift(priority.clickMultiplier)}`,
    ].join('\n')
  }, [durationDays, market.label, marketId, placement.label, priority.clickMultiplier, priority.label, result.currency, result.dailyImpressions, result.effectiveCpm, result.impressions, result.investment])

  const whatsappUrl = `https://wa.me/5491136491620?text=${encodeURIComponent(quoteSummary)}`

  const copySummary = async () => {
    await navigator.clipboard.writeText(quoteSummary)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_800)
  }

  return (
    <div className={styles.calculatorShell}>
      <section className={styles.controls} aria-labelledby="calculator-controls-title">
        <div className={styles.panelHeading}>
          <span>01</span>
          <div>
            <h2 id="calculator-controls-title">Diseñá tu campaña</h2>
            <p>Elegí dónde aparecer, el mercado y durante cuántos días. Calculamos el presupuesto automáticamente.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.fieldWide}>
            <span>Ubicación del banner</span>
            <select value={placementId} onChange={(event) => onPlacementChange(event.target.value as BannerPlacementId)}>
              {BANNER_PLACEMENTS.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
            <small>{placement.description}</small>
          </label>

          <div className={`${styles.selectedPlacement} ${styles.fieldWide}`}>
            <div className={styles.selectedPlacementVisual} data-placement-preview={placement.id}>
              <Image src={placement.previewSrc} alt={placement.previewAlt} width={1392} height={2880} sizes="220px" />
              <span>Tu banner</span>
            </div>
            <div>
              <span>Vista en la app</span>
              <strong>{placement.label}</strong>
              <p>{placement.location}</p>
            </div>
          </div>

          <label>
            <span>Mercado</span>
            <select value={marketId} onChange={(event) => setMarketId(event.target.value as BannerMarketId)}>
              {BANNER_MARKETS.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>

          <label>
            <span>Prioridad</span>
            <select value={priorityId} onChange={(event) => setPriorityId(event.target.value as BannerPriorityId)}>
              {BANNER_PRIORITIES.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
            <small>{priority.description}</small>
          </label>

          <label className={styles.fieldWide}>
            <span>Duración</span>
            <select value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>
              {[1, 3, 7, 14, 30].map((days) => <option value={days} key={days}>{days} {days === 1 ? 'día' : 'días'}</option>)}
            </select>
            <small>La duración define las impresiones totales, los clicks y la inversión.</small>
          </label>
        </div>
      </section>

      <aside className={styles.result} aria-live="polite">
        <div className={styles.resultTopline}>
          <span>Estimación de campaña</span>
          <span>{placement.shortLabel}</span>
        </div>

        <div className={styles.investment}>
          <small>Inversión estimada</small>
          <strong>{formatCurrency(result.investment, result.currency)}</strong>
          <p>Calculada para {durationDays} {durationDays === 1 ? 'día' : 'días'} según el inventario diario de {placement.shortLabel}.</p>
        </div>

        {result.minimumApplied && (
          <div className={styles.notice}>Se aplicó la inversión mínima de {formatCurrency(result.minimumInvestment, result.currency)} y sumamos las impresiones incluidas.</div>
        )}

        <div className={styles.resultMetrics}>
          <article>
            <Eye size={18} />
            <span>Impresiones</span>
            <strong>{formatInteger(result.impressions)}</strong>
          </article>
          <article>
            <WalletCards size={18} />
            <span>CPM efectivo</span>
            <strong>{formatCurrency(result.effectiveCpm, result.currency, 2)}</strong>
          </article>
          <article>
            <MousePointerClick size={18} />
            <span>Clicks estimados</span>
            <strong>{formatCompact(result.clicksLow)}–{formatCompact(result.clicksHigh)}</strong>
          </article>
          <article className={styles.durationMetric}>
            <CalendarDays size={18} />
            <span>Duración</span>
            <strong>{durationDays} {durationDays === 1 ? 'día' : 'días'}</strong>
            <small>{formatCompact(result.dailyImpressions)} impresiones por día</small>
          </article>
        </div>

        <div className={styles.breakdown}>
          <h3>Precio y rendimiento</h3>
          <div><span>CPM base común</span><strong>{formatCurrency(getBannerPlacementCpm(placement.id, marketId), market.currency, 2)}</strong></div>
          <div><span>{priority.label} · precio</span><strong>× {priority.multiplier.toFixed(2)}</strong></div>
          <div className={styles.performanceFactor}><span>{priority.label} · clicks</span><strong>{formatUplift(priority.clickMultiplier)}</strong></div>
        </div>

        <div className={styles.delivery}>
          <Layers3 size={17} />
          <div>
            <strong>{formatInteger(result.dailyImpressions)} impresiones por día</strong>
            <span>Base informada para {placement.shortLabel}; el total se multiplica por la duración elegida.</span>
          </div>
        </div>

        <a className={styles.primaryAction} href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          Consultar disponibilidad <ArrowRight size={18} />
        </a>
        <button className={styles.copyAction} type="button" onClick={copySummary}>
          <Copy size={16} /> {copied ? 'Resumen copiado' : 'Copiar resumen'}
        </button>
        <small className={styles.disclaimer}>
          Tarifas vigentes hasta el {BANNER_PRICE_VALID_UNTIL}. Estimación comercial en {market.currency === 'ARS' ? 'pesos argentinos' : 'dólares estadounidenses'}, sujeta a disponibilidad y aprobación de la creatividad. Los factores de entrega y clicks por prioridad son proyecciones y no una garantía.
        </small>
      </aside>
    </div>
  )
}
