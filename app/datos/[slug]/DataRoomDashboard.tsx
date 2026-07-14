'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BellRing,
  Building2,
  CalendarCheck2,
  Clock3,
  Compass,
  ExternalLink,
  Footprints,
  Gift,
  LogOut,
  MapPinned,
  Megaphone,
  MousePointerClick,
  Repeat2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Trophy,
  UserPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import type {
  ActivityTimelineDatum,
  BrandDataSnapshot,
  CountDatum,
  TopChallengeDatum,
  TopRewardDatum,
} from '@/lib/data-room/types'
import { DataRoomViewTracker } from './DataRoomViewTracker'

const numberFormatter = new Intl.NumberFormat('es-AR')
const compactFormatter = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })
const percentFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0)
}

function formatLargeNumber(value: number) {
  if (value >= 1_000_000_000) return `${percentFormatter.format(value / 1_000_000_000)} mil millones`
  if (value >= 1_000_000) return `${percentFormatter.format(value / 1_000_000)} M`
  if (value >= 1_000) return `${percentFormatter.format(value / 1_000)} mil`
  return formatNumber(value)
}

function percentage(value: number, total: number) {
  if (!total) return '0%'
  return `${percentFormatter.format((value / total) * 100)}%`
}

function formatChange(value: number | null) {
  if (value == null) return 'Sin período comparable'
  return `${value > 0 ? '+' : ''}${percentFormatter.format(value)}%`
}

function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '')
}

function formatDay(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace('.', '')
}

function inclusiveDayCount(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 0
  const start = Date.parse(`${startDate}T00:00:00.000Z`)
  const end = Date.parse(`${endDate}T00:00:00.000Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.floor((end - start) / 86_400_000) + 1
}

const activityEventTone: Record<ActivityTimelineDatum['kind'], {
  dot: string
  pill: string
  stroke: string
  prefix: string
}> = {
  challenge_start: {
    dot: 'bg-[#007A4A]',
    pill: 'border-[#B8DCCA] bg-[#EDF8F1] text-[#005C38]',
    stroke: '#007A4A',
    prefix: 'Inicio',
  },
  challenge_end: {
    dot: 'bg-[#A62C78]',
    pill: 'border-[#EFA6DF] bg-[#FFF0FB] text-[#702353]',
    stroke: '#A62C78',
    prefix: 'Fin',
  },
  context: {
    dot: 'bg-[#400224]',
    pill: 'border-[#DFA5CC] bg-[#FFC2F4] text-[#400224]',
    stroke: '#400224',
    prefix: 'Contexto',
  },
}

function formatRefreshDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
    .format(new Date(value))
    .replace(/[\u00a0\u202f]/g, ' ')
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—'
  if (seconds < 60) return `${formatNumber(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return remainingSeconds ? `${minutes} min ${remainingSeconds} s` : `${minutes} min`
}

const marketingLabels: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  catalog_locales: 'Locales',
  catalog_online: 'Online',
  catalog_recompensas: 'Recompensas',
  catalog_reservas: 'Reservas',
  catalog_descuentos: 'Descuentos',
  partners_map: 'Mapa de comercios',
  locales: 'Locales',
  online: 'Online',
  recompensas: 'Recompensas',
  reservas: 'Reservas',
  descuentos: 'Descuentos',
  category: 'Categoría',
  price: 'Precio',
  affordable: 'Me alcanza',
  favorites: 'Favoritos',
  open_now: 'Abierto ahora',
}

function formatMarketingLabel(label: string) {
  return marketingLabels[label.toLowerCase()] ?? label
}

function translateMarketingRows(rows: CountDatum[]) {
  return rows.map((row) => ({ ...row, label: formatMarketingLabel(row.label) }))
}

function ExecutiveCard({
  tone,
  icon,
  eyebrow,
  value,
  helper,
  children,
}: {
  tone: 'forest' | 'pink' | 'paper'
  icon: React.ReactNode
  eyebrow: string
  value: string
  helper: string
  children: React.ReactNode
}) {
  const isForest = tone === 'forest'
  const isPink = tone === 'pink'
  const cardTone = isForest
    ? 'border-[#004027] bg-[#004027] text-white shadow-[0_20px_45px_rgba(0,64,39,0.16)]'
    : isPink
      ? 'border-[#EFA6DF] bg-[#FFC2F4] text-[#400224] shadow-[0_18px_40px_rgba(89,32,104,0.12)]'
      : 'border-[#DDE6DF] bg-white text-[#004027] shadow-[0_18px_42px_rgba(0,64,39,0.06)]'
  const iconTone = isForest
    ? 'bg-[#FFC2F4] text-[#400224]'
    : isPink
      ? 'bg-[#400224] text-[#FFC2F4]'
      : 'bg-[#EAF4ED] text-[#006D42]'

  return (
    <article className={`relative flex min-h-[270px] flex-col overflow-hidden rounded-[28px] border p-5 sm:p-6 ${cardTone}`}>
      <span
        className={`pointer-events-none absolute -right-10 -top-12 size-36 rounded-full ${
          isForest ? 'bg-[#FFC2F4]/12' : isPink ? 'bg-white/28' : 'bg-[#FFC2F4]/30'
        }`}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className={`flex size-10 items-center justify-center rounded-2xl ${iconTone}`}>{icon}</div>
        <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isForest ? 'text-white/55' : isPink ? 'text-[#400224]/55' : 'text-[#53625A]'}`}>
          Resumen
        </span>
      </div>
      <div className="relative mt-7">
        <p className={`text-xs font-bold uppercase tracking-[0.1em] ${isForest ? 'text-[#FFC2F4]' : isPink ? 'text-[#6F174D]' : 'text-[#53625A]'}`}>
          {eyebrow}
        </p>
        <p className="mt-2 text-[40px] font-bold leading-none tracking-[-0.05em] sm:text-[44px]">{value}</p>
        <p className={`mt-3 text-sm leading-5 ${isForest ? 'text-white/65' : isPink ? 'text-[#6F3157]' : 'text-[#59675F]'}`}>{helper}</p>
      </div>
      <div className="relative mt-auto pt-6">{children}</div>
    </article>
  )
}

function SummaryStat({
  label,
  value,
  inverse = false,
  pink = false,
}: {
  label: string
  value: string
  inverse?: boolean
  pink?: boolean
}) {
  return (
    <div className={`border-t pt-3 ${inverse ? 'border-white/15' : pink ? 'border-[#400224]/15' : 'border-[#004027]/10'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${inverse ? 'text-white/50' : pink ? 'text-[#702353]' : 'text-[#66706B]'}`}>
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tracking-[-0.03em] ${inverse ? 'text-white' : pink ? 'text-[#400224]' : 'text-[#004027]'}`}>{value}</p>
    </div>
  )
}

function SignalCard({
  icon,
  label,
  value,
  helper,
  pink = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  helper: string
  pink?: boolean
}) {
  return (
    <article className={`rounded-2xl border p-5 ${pink ? 'border-[#EFA6DF] bg-[#FFC2F4]' : 'border-[#DDE6DF] bg-white'}`}>
      <div className={`flex size-9 items-center justify-center rounded-xl ${pink ? 'bg-[#400224] text-[#FFC2F4]' : 'bg-[#EAF4ED] text-[#006D42]'}`}>
        {icon}
      </div>
      <p className={`mt-5 text-xs font-bold uppercase tracking-[0.08em] ${pink ? 'text-[#702353]' : 'text-[#53625A]'}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-[-0.04em] ${pink ? 'text-[#400224]' : 'text-[#004027]'}`}>{value}</p>
      <p className={`mt-2 text-xs leading-5 ${pink ? 'text-[#6F3157]' : 'text-[#59675F]'}`}>{helper}</p>
    </article>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="scroll-mt-6">
      <div className="mb-5 flex gap-3">
        <span className="mt-1 h-6 w-1 rounded-full bg-[#FFC2F4] ring-1 ring-[#EFA6DF]" />
        <div>
        <h2 className="text-xl font-bold tracking-[-0.02em] text-[#102A1E] sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#66706B]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function Panel({
  title,
  helper,
  children,
  className = '',
}: {
  title: string
  helper?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <article className={`min-w-0 rounded-2xl border border-[#E0E8E1] bg-white p-4 shadow-[0_12px_32px_rgba(0,64,39,0.04)] sm:p-5 ${className}`}>
      <h3 className="text-sm font-bold text-[#102A1E]">{title}</h3>
      {helper ? <p className="mt-1 text-xs leading-5 text-[#66706B]">{helper}</p> : null}
      <div className="mt-4">{children}</div>
    </article>
  )
}

function ClientOnlyChart({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])

  return ready ? <>{children}</> : <div className="h-full w-full" aria-hidden />
}

function RankedList({
  rows,
  empty = 'Todavía no hay datos suficientes.',
}: {
  rows: CountDatum[]
  empty?: string
}) {
  const max = Math.max(...rows.map((row) => row.count), 1)

  if (!rows.length) {
    return <p className="py-6 text-sm text-[#79817C]">{empty}</p>
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-medium text-[#27302B]" title={row.label}>{row.label}</span>
            <span className="shrink-0 tabular-nums text-[#66706B]">{formatNumber(row.count)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EDF1EE]">
            <div
              className="h-full rounded-full bg-[#006D42]"
              style={{ width: `${Math.max((row.count / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopRewardsTable({ rows }: { rows: TopRewardDatum[] }) {
  if (!rows.length) return <p className="py-6 text-sm text-[#79817C]">Todavía no hay canjes.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E8EDE9] text-[11px] uppercase tracking-[0.06em] text-[#66706B]">
            <th className="pb-2 font-semibold">Premio</th>
            <th className="pb-2 font-semibold">Comercio</th>
            <th className="pb-2 text-right font-semibold">Canjes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.partner}-${row.label}`} className="border-b border-[#EEF1EF] last:border-0">
              <td className="py-3 pr-4 font-semibold text-[#27302B]">{row.label}</td>
              <td className="py-3 pr-4 text-[#66706B]">{row.partner}</td>
              <td className="py-3 text-right font-semibold tabular-nums text-[#171D1A]">{formatNumber(row.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChallengeTable({ rows }: { rows: TopChallengeDatum[] }) {
  if (!rows.length) {
    return <p className="py-7 text-sm text-[#79817C]">Todavía no hubo desafíos de marca en este país.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E8EDE9] text-[11px] uppercase tracking-[0.06em] text-[#66706B]">
            <th className="pb-2 font-semibold">Activación</th>
            <th className="pb-2 text-right font-semibold">Participantes</th>
            <th className="pb-2 text-right font-semibold">Pasos validados</th>
            <th className="pb-2 text-right font-semibold">Shares IG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#EEF1EF] last:border-0">
              <td className="py-3 pr-5">
                <p className="font-semibold text-[#27302B]">{row.label}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.06em] text-[#7A847E]">{row.brand}</p>
              </td>
              <td className="py-3 text-right font-semibold tabular-nums">{formatNumber(row.participants)}</td>
              <td className="py-3 text-right font-semibold tabular-nums">{formatLargeNumber(row.validatedSteps)}</td>
              <td className="py-3 text-right font-semibold tabular-nums">{formatNumber(row.instagramShares)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tooltipStyle = {
  border: '1px solid #DDE6DF',
  borderRadius: 14,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(23,29,26,.08)',
}

export function DataRoomDashboard({
  brandName,
  slug,
  snapshots,
}: {
  brandName: string
  slug: string
  snapshots: BrandDataSnapshot[]
}) {
  const router = useRouter()
  const [isLoggingOut, startLogout] = useTransition()
  const initialCountry = snapshots.some((snapshot) => snapshot.country_code === 'AR') ? 'AR' : snapshots[0]?.country_code
  const [countryCode, setCountryCode] = useState<'AR' | 'UY'>(initialCountry ?? 'AR')
  const snapshot = (snapshots.find((item) => item.country_code === countryCode) ?? snapshots[0])!
  const data = snapshot.payload
  const h = data.headline
  const engagement = data.engagement ?? {
    appOpenDays30d: 0,
    averageOpenDaysPerActive: 0,
    recurrentUsers30d: 0,
    validatedSteps30d: 0,
    averageStepsPerActiveDay: 0,
    pasitosEarned30d: 0,
    pushReachableUsers: 0,
    notificationsSent30d: 0,
    notificationsOpened30d: 0,
  }
  const marketing = data.marketing ?? {
    dauLastCompleteDay: 0,
    averageDau30d: 0,
    peakDau30d: 0,
    wau7d: 0,
    mau30d: h.activeUsers30d,
    activePersonDays30d: engagement.appOpenDays30d,
    stickinessDauMau: 0,
    dauChange1d: null,
    wauChange7d: null,
    mauChange30d: null,
    pushSendsLastCompleteDay: 0,
    averagePushSendsPerDay: 0,
    pushSends30d: engagement.notificationsSent30d,
    pushOpens30d: engagement.notificationsOpened30d,
    catalogDetailViewsDaily: null,
    catalogDetailViews30d: null,
    catalogClicksDaily: null,
    catalogClicks30d: null,
    catalogClickersDaily: null,
    catalogCoverageStartDate: null,
    catalogDataThroughDate: null,
    catalogMetricsRefreshedAt: null,
    catalogMeasurementStatus: 'pending_firebase_mixpanel_export' as const,
    mixpanelSessions30d: 0,
    mixpanelAverageSessionSeconds: null,
    mixpanelFirstOpens30d: 0,
    mixpanelSignUps30d: 0,
    mixpanelMapMarkerTaps30d: 0,
    mixpanelFilterChanges30d: 0,
    mixpanelExternalLinkOpens30d: 0,
    mixpanelSocialShares30d: 0,
    mixpanelReservationRequests30d: 0,
    mixpanelReservationContactOpens30d: 0,
    mixpanelPlatformSessions: [],
    mixpanelCatalogSurfaces: [],
    mixpanelCatalogTabs: [],
    mixpanelFilterTypes: [],
    mixpanelTopViewedRewards: [],
    mixpanelTopViewedPartners: [],
    mixpanelCoverageStartDate: null,
    mixpanelDataThroughDate: null,
    mixpanelMetricsRefreshedAt: null,
    mixpanelBehaviorStatus: 'pending' as const,
  }
  const challenge = data.challengePerformance ?? {
    challenges: 0,
    participantUsers: 0,
    participations: 0,
    instagramShares: 0,
    winners: 0,
    validatedSteps: 0,
    topChallenges: [],
  }
  const ageData = useMemo(() => data.ageDistribution.map((row) => ({
    label: row.label,
    usuarios: row.count,
    canjeadores: data.redeemerAgeDistribution.find((item) => item.label === row.label)?.count ?? 0,
  })), [data.ageDistribution, data.redeemerAgeDistribution])
  const dailyActiveDomain = useMemo<[number, number]>(() => {
    const counts = (data.dailyActiveTrend ?? []).map((row) => row.count)
    if (!counts.length) return [0, 1]
    const minimum = Math.min(...counts)
    const maximum = Math.max(...counts)
    const padding = Math.max((maximum - minimum) * 0.12, maximum * 0.04, 1)
    return [Math.max(0, Math.floor(minimum - padding)), Math.ceil(maximum + padding)]
  }, [data.dailyActiveTrend])
  const activityTimeline = data.activityTimeline ?? []
  const activityMarkers = useMemo(() => {
    const markerDates = new Map<string, ActivityTimelineDatum['kind']>()
    for (const event of activityTimeline) {
      const existing = markerDates.get(event.date)
      if (!existing || event.kind === 'context') markerDates.set(event.date, event.kind)
    }
    return markerDates
  }, [activityTimeline])
  const extraPurchaseRate = percentage(data.survey.extraPurchases, data.survey.responses)
  const likedRate = percentage(data.survey.liked, data.survey.likedResponses)
  const valueCoverage = percentage(h.valueSampleSize, h.redemptionsTotal)
  const pushOpenRate = percentage(marketing.pushOpens30d, marketing.pushSends30d)
  const recentRedeemers = h.redeemingUsers30d ?? 0
  const repeatRedeemers = h.repeatRedeemers ?? 0
  const recentConversionRate = percentage(recentRedeemers, h.activeUsers30d)
  const repeatRate = percentage(repeatRedeemers, h.redeemingUsers)
  const sessionsPerActive = marketing.mau30d > 0
    ? marketing.mixpanelSessions30d / marketing.mau30d
    : 0
  const catalogCoverageDays = inclusiveDayCount(
    marketing.catalogCoverageStartDate,
    marketing.catalogDataThroughDate,
  )
  const catalogPeriodReady = catalogCoverageDays >= 2
  const catalogPeriodLabel = catalogCoverageDays === 30
    ? '30 días'
    : catalogCoverageDays > 0
      ? `${catalogCoverageDays} ${catalogCoverageDays === 1 ? 'día medido' : 'días medidos'}`
      : 'período medido'
  const moneyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: data.currency,
    maximumFractionDigits: 0,
  })

  function logout() {
    startLogout(async () => {
      await fetch('/api/data-room/logout', { method: 'POST' })
      router.refresh()
    })
  }

  return (
    <main className="min-h-dvh bg-[#FCF7F0] text-[#171D1A]">
      <DataRoomViewTracker slug={slug} />
      <header className="overflow-hidden bg-[#004027] text-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/brand/logo-lime.svg" alt="Pasito" className="h-7 w-auto shrink-0" />
            <span className="hidden h-5 w-px bg-white/20 sm:block" />
            <p className="truncate text-sm font-semibold text-white/80">Sala de datos · {brandName}</p>
          </div>
          <button
            type="button"
            aria-label="Salir"
            onClick={logout}
            disabled={isLoggingOut}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <LogOut size={14} aria-hidden />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        <div className="relative mx-auto max-w-[1240px] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[52px] border-[#FFC2F4]/12" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFC2F4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#400224]">
                <Sparkles size={13} aria-hidden /> Inteligencia de audiencia
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
                Movimiento real para decisiones de marca
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Alcance, atención, actividad, preferencias y conversión. Datos agregados de la comunidad Pasito, sin información personal.
              </p>
              <p className="mt-5 text-xs text-white/55">
                Actualizado {formatRefreshDate(snapshot.refreshed_at)}
                {' · '}refresco automático 5 veces por día
              </p>
            </div>

            <div
              className="flex w-fit rounded-xl border border-white/15 bg-white/5 p-1"
              role="group"
              aria-label="Seleccionar país"
            >
              {snapshots.map((item) => (
                <button
                  key={item.country_code}
                  type="button"
                  aria-pressed={countryCode === item.country_code}
                  onClick={() => setCountryCode(item.country_code)}
                  className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                    countryCode === item.country_code
                      ? 'bg-[#FFC2F4] text-[#400224] shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.payload.countryName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section aria-labelledby="executive-summary-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#006D42]">En un vistazo</p>
              <h2 id="executive-summary-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#102A1E]">
                Resumen ejecutivo
              </h2>
            </div>
            <p className="text-xs text-[#66706B]">{data.countryName} · actividad y conversión acumulada</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              tone="forest"
              icon={<UsersRound size={19} aria-hidden />}
              eyebrow="Comunidad"
              value={formatNumber(h.registeredUsers)}
              helper={`personas registradas en ${data.countryName}`}
            >
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat label="Activas · 30 días" value={formatNumber(h.activeUsers30d)} inverse />
                <SummaryStat label="Nuevas · 30 días" value={formatNumber(h.newUsers30d)} inverse />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between gap-3 text-[11px] text-white/55">
                  <span>Base activa</span>
                  <strong className="text-[#FFC2F4]">{percentage(h.activeUsers30d, h.registeredUsers)}</strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#FFC2F4]"
                    style={{ width: `${Math.min((h.activeUsers30d / Math.max(h.registeredUsers, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </ExecutiveCard>

            <ExecutiveCard
              tone="pink"
              icon={<MousePointerClick size={19} aria-hidden />}
              eyebrow="Conversión"
              value={formatNumber(h.redeemingUsers)}
              helper={`${percentage(h.redeemingUsers, h.registeredUsers)} de la comunidad ya canjeó`}
            >
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat label="Canjes totales" value={formatNumber(h.redemptionsTotal)} pink />
                <SummaryStat label="Canjes · 30 días" value={formatNumber(h.redemptions30d)} pink />
              </div>
              <p className="mt-4 rounded-xl bg-[#400224]/8 px-3 py-2 text-[11px] font-semibold text-[#5D1742]">
                {recentConversionRate} de las personas activas canjeó en los últimos 30 días
              </p>
            </ExecutiveCard>

            <ExecutiveCard
              tone="paper"
              icon={<Building2 size={19} aria-hidden />}
              eyebrow="Ecosistema"
              value={formatNumber(h.activePartners)}
              helper="comercios activos y aprobados"
            >
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat label="Premios activos" value={formatNumber(h.activeRewards)} />
                <SummaryStat
                  label="Premios / comercio"
                  value={percentFormatter.format(h.activeRewards / Math.max(h.activePartners, 1))}
                />
              </div>
              <p className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-[#59675F]">
                <Gift size={14} className="text-[#006D42]" aria-hidden /> Oferta disponible hoy en la app
              </p>
            </ExecutiveCard>

            <ExecutiveCard
              tone="paper"
              icon={<WalletCards size={19} aria-hidden />}
              eyebrow="Valor del canje"
              value={h.averageRedeemedValue == null ? '—' : moneyFormatter.format(h.averageRedeemedValue)}
              helper="valor comercial promedio declarado"
            >
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat
                  label="Mediana"
                  value={h.medianRedeemedValue == null ? '—' : moneyFormatter.format(h.medianRedeemedValue)}
                />
                <SummaryStat label="Cobertura" value={valueCoverage} />
              </div>
              <p className="mt-4 rounded-xl bg-[#FFF0FB] px-3 py-2 text-[11px] font-semibold text-[#6F3157]">
                {formatNumber(h.averagePasitosSpent)} Pasitos promedio por canje
              </p>
            </ExecutiveCard>
          </div>
        </section>

        <div className="mt-12 space-y-14">
          <Section
            title="Audiencia de marketing"
            description="DAU, WAU y MAU calculados sobre días completos. El día en curso se excluye para evitar caídas artificiales por datos parciales."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SignalCard
                icon={<Activity size={18} aria-hidden />}
                label="DAU promedio"
                value={formatLargeNumber(marketing.averageDau30d)}
                helper={`${formatNumber(marketing.dauLastCompleteDay)} en el último día completo`}
                pink
              />
              <SignalCard
                icon={<UsersRound size={18} aria-hidden />}
                label="WAU · 7 días"
                value={formatLargeNumber(marketing.wau7d)}
                helper={`${formatChange(marketing.wauChange7d)} vs. los 7 días anteriores`}
              />
              <SignalCard
                icon={<UsersRound size={18} aria-hidden />}
                label="MAU · 30 días"
                value={formatLargeNumber(marketing.mau30d)}
                helper={`${formatChange(marketing.mauChange30d)} vs. los 30 días anteriores`}
              />
              <SignalCard
                icon={<Repeat2 size={18} aria-hidden />}
                label="Stickiness DAU / MAU"
                value={`${percentFormatter.format(marketing.stickinessDauMau)}%`}
                helper={`${formatLargeNumber(marketing.peakDau30d)} de pico DAU en el período`}
                pink
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SignalCard
                icon={<Activity size={18} aria-hidden />}
                label="Jornadas activas"
                value={formatLargeNumber(marketing.activePersonDays30d)}
                helper={`${formatNumber(marketing.activePersonDays30d)} oportunidades de contacto en la app`}
                pink
              />
              <SignalCard
                icon={<Repeat2 size={18} aria-hidden />}
                label="Frecuencia mensual"
                value={`${percentFormatter.format(engagement.averageOpenDaysPerActive)} días`}
                helper="Promedio de días de uso por persona activa"
              />
              <SignalCard
                icon={<UsersRound size={18} aria-hidden />}
                label="Audiencia recurrente"
                value={formatLargeNumber(engagement.recurrentUsers30d)}
                helper={`${percentage(engagement.recurrentUsers30d, h.activeUsers30d)} usó Pasito 8 días o más`}
              />
              <SignalCard
                icon={<Footprints size={18} aria-hidden />}
                label="Pasos validados"
                value={formatLargeNumber(engagement.validatedSteps30d)}
                helper={`${formatNumber(engagement.averageStepsPerActiveDay)} pasos promedio por jornada activa`}
                pink
              />
            </div>

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
              <Panel title="DAU por día" helper="Personas únicas por jornada durante los últimos 30 días completos.">
                <div className="grid gap-2 rounded-2xl bg-[#FFF0FB] p-3 sm:grid-cols-2 sm:p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#702353]">Promedio diario</p>
                    <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#400224]">{formatLargeNumber(marketing.averageDau30d)}</p>
                  </div>
                  <div className="sm:border-l sm:border-[#400224]/10 sm:pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#702353]">Último día completo</p>
                    <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#400224]">{formatLargeNumber(marketing.dauLastCompleteDay)}</p>
                  </div>
                </div>
                <div className="mt-4 h-[245px] w-full">
                  <ClientOnlyChart>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyActiveTrend ?? []} margin={{ top: 24, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#E8EDE9" />
                      <XAxis dataKey="date" tickFormatter={formatDay} interval="preserveStartEnd" minTickGap={32} tickMargin={8} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                      <YAxis domain={dailyActiveDomain} tickFormatter={(value) => compactFormatter.format(Number(value))} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => formatDay(String(label))}
                        formatter={(value) => [formatNumber(Number(value)), 'Personas activas']}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#A62C78"
                        strokeWidth={3}
                        dot={(props: { cx?: number; cy?: number; payload?: { date?: string } }) => {
                          const date = props.payload?.date
                          const kind = date ? activityMarkers.get(date) : undefined
                          if (!kind || props.cx == null || props.cy == null) return <g />
                          const tone = activityEventTone[kind]
                          return (
                            <g>
                              <line
                                x1={props.cx}
                                x2={props.cx}
                                y1={12}
                                y2={218}
                                stroke={tone.stroke}
                                strokeDasharray={kind === 'context' ? '3 3' : '2 5'}
                                strokeOpacity={kind === 'context' ? 0.9 : 0.45}
                              />
                              <circle cx={props.cx} cy={props.cy} r={4} fill={tone.stroke} stroke="white" strokeWidth={2} />
                              {kind === 'context' ? (
                                <text
                                  x={props.cx - 6}
                                  y={17}
                                  textAnchor="end"
                                  fill="#400224"
                                  fontSize={10}
                                  fontWeight={700}
                                >
                                  Mundial
                                </text>
                              ) : null}
                            </g>
                          )
                        }}
                        activeDot={{ r: 5, fill: '#FFC2F4', stroke: '#400224', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </ClientOnlyChart>
                </div>
                {activityTimeline.length ? (
                  <div className="mt-4 border-t border-[#E8EDE9] pt-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#102A1E]">Eventos para interpretar la curva</p>
                        <p className="mt-1 text-[11px] leading-4 text-[#66706B]">Los hitos dan contexto; por sí solos no prueban causalidad.</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-[#66706B]">
                        {(['challenge_start', 'challenge_end', 'context'] as const).map((kind) => (
                          <span key={kind} className="inline-flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${activityEventTone[kind].dot}`} />
                            {activityEventTone[kind].prefix}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Eventos del período">
                      {activityTimeline.map((event, index) => {
                        const tone = activityEventTone[event.kind]
                        return (
                          <div
                            key={`${event.date}-${event.kind}-${event.label}-${index}`}
                            className={`min-w-[190px] rounded-xl border px-3 py-2.5 ${tone.pill}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`size-2 rounded-full ${tone.dot}`} />
                              <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
                                {formatDay(event.date)} · {tone.prefix}
                              </p>
                            </div>
                            <p className="mt-1.5 text-xs font-bold leading-4">{event.label}</p>
                            {event.detail ? <p className="mt-1 text-[10px] leading-4 opacity-70">{event.detail}</p> : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </Panel>

              <Panel title="Alcance directo por push" helper="Envíos aceptados por el proveedor y aperturas registradas durante 30 días completos.">
                <div className="rounded-2xl bg-[#004027] p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">Personas alcanzables</p>
                      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#FFC2F4]">{formatLargeNumber(engagement.pushReachableUsers)}</p>
                    </div>
                    <BellRing className="text-[#FFC2F4]" size={28} aria-hidden />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
                    <div>
                      <p className="text-xl font-bold">{formatLargeNumber(marketing.averagePushSendsPerDay)}</p>
                      <p className="mt-1 text-xs text-white/60">promedio por día</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{formatLargeNumber(marketing.pushSends30d)}</p>
                      <p className="mt-1 text-xs text-white/60">enviadas en 30 días</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{pushOpenRate}</p>
                      <p className="mt-1 text-xs text-white/60">tasa de apertura</p>
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl bg-[#FFC2F4] px-3 py-2 text-xs font-semibold text-[#400224]">
                    {formatNumber(marketing.pushSendsLastCompleteDay)} envíos en el último día completo
                  </p>
                </div>
              </Panel>
            </div>

            <div className="mt-4">
              <Panel
                title="Vistas de detalle y clicks de catálogo"
                helper="Interacciones verificadas sobre premios y comercios dentro de la app."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ['Vistas de detalle · día', marketing.catalogDetailViewsDaily],
                    [`Vistas de detalle · ${catalogPeriodLabel}`, catalogPeriodReady ? marketing.catalogDetailViews30d : null],
                    ['Clicks de catálogo · día', marketing.catalogClicksDaily],
                    [`Clicks de catálogo · ${catalogPeriodLabel}`, catalogPeriodReady ? marketing.catalogClicks30d : null],
                    ['Personas que hicieron click · día', marketing.catalogClickersDaily],
                  ].map(([label, value], index) => (
                    <div
                      key={String(label)}
                      className={`relative overflow-hidden rounded-2xl border p-4 ${
                        index === 1 || index === 4
                          ? 'border-[#EFA6DF] bg-[#FFC2F4] text-[#400224]'
                          : 'border-[#F3D4EB] bg-[#FFF8FD] text-[#004027]'
                      }`}
                    >
                      <span className="absolute -right-5 -top-6 size-16 rounded-full bg-white/35" aria-hidden />
                      <p className="relative text-xs font-bold uppercase tracking-[0.07em] opacity-65">{label}</p>
                      <p className="relative mt-3 text-3xl font-bold tracking-[-0.04em]">
                        {typeof value === 'number' ? formatLargeNumber(value) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
                {marketing.catalogMeasurementStatus === 'connected' ? (
                  <div className="mt-4 flex gap-3 rounded-2xl border border-[#F3D4EB] bg-[#FFF8FD] p-4 text-sm leading-6 text-[#59424F]">
                    <MousePointerClick className="mt-0.5 shrink-0 text-[#A12B77]" size={18} aria-hidden />
                    <p>
                      Fuente: Mixpanel, consolidada por país y sin guardar eventos ni identificadores personales.
                      {marketing.catalogCoverageStartDate && marketing.catalogDataThroughDate && (
                        marketing.catalogCoverageStartDate === marketing.catalogDataThroughDate ? (
                          <> Cobertura disponible únicamente para el <strong>{formatDay(marketing.catalogDataThroughDate)}</strong>; el histórico todavía se está completando.</>
                        ) : (
                          <> Cobertura disponible del <strong>{formatDay(marketing.catalogCoverageStartDate)}</strong> al <strong>{formatDay(marketing.catalogDataThroughDate)}</strong>{catalogCoverageDays < 30 ? ` (${catalogCoverageDays} días medidos)` : ''}.</>
                        )
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3 rounded-2xl border border-[#DDE6DF] bg-white p-4 text-sm leading-6 text-[#59635D]">
                    <MousePointerClick className="mt-0.5 shrink-0 text-[#006D42]" size={18} aria-hidden />
                    <p>
                      Pasito ya registra <strong>reward_viewed</strong>, <strong>partner_viewed</strong> y clicks en Firebase/Mixpanel.
                      La conexión de lectura todavía no completó su primera sincronización.
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          </Section>

          <Section
            title="Comportamiento e intención"
            description="Señales de uso, descubrimiento e intención registradas en Mixpanel durante los últimos 30 días completos."
          >
            {marketing.mixpanelBehaviorStatus === 'connected' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SignalCard
                    icon={<Smartphone size={18} aria-hidden />}
                    label="Sesiones en la app"
                    value={formatLargeNumber(marketing.mixpanelSessions30d)}
                    helper={`${percentFormatter.format(sessionsPerActive)} sesiones por persona activa en el período`}
                    pink
                  />
                  <SignalCard
                    icon={<Clock3 size={18} aria-hidden />}
                    label="Duración promedio"
                    value={formatDuration(marketing.mixpanelAverageSessionSeconds)}
                    helper="Tiempo medio por sesión automática de Mixpanel"
                  />
                  <SignalCard
                    icon={<Compass size={18} aria-hidden />}
                    label="Primeras aperturas"
                    value={formatLargeNumber(marketing.mixpanelFirstOpens30d)}
                    helper="Dispositivos que abrieron Pasito por primera vez"
                    pink
                  />
                  <SignalCard
                    icon={<UserPlus size={18} aria-hidden />}
                    label="Altas registradas"
                    value={formatLargeNumber(marketing.mixpanelSignUps30d)}
                    helper="Eventos de creación de cuenta completada"
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Panel title="Sesiones por plataforma" helper="Distribución de sesiones, no de perfiles registrados.">
                    <RankedList rows={translateMarketingRows(marketing.mixpanelPlatformSessions)} />
                  </Panel>
                  <Panel title="Secciones elegidas" helper="Cambios de pestaña dentro del catálogo.">
                    <RankedList rows={translateMarketingRows(marketing.mixpanelCatalogTabs)} />
                  </Panel>
                  <Panel title="Origen de los clicks" helper="Superficies desde las que abren un premio o comercio.">
                    <RankedList rows={translateMarketingRows(marketing.mixpanelCatalogSurfaces)} />
                  </Panel>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SignalCard
                    icon={<MapPinned size={18} aria-hidden />}
                    label="Interacciones con el mapa"
                    value={formatLargeNumber(marketing.mixpanelMapMarkerTaps30d)}
                    helper="Toques sobre pines de comercios"
                    pink
                  />
                  <SignalCard
                    icon={<SlidersHorizontal size={18} aria-hidden />}
                    label="Uso de filtros"
                    value={formatLargeNumber(marketing.mixpanelFilterChanges30d)}
                    helper="Cambios de categoría, precio, cercanía y favoritos"
                  />
                  <SignalCard
                    icon={<ExternalLink size={18} aria-hidden />}
                    label="Clicks hacia afuera"
                    value={formatLargeNumber(marketing.mixpanelExternalLinkOpens30d)}
                    helper="Aperturas de tiendas, Instagram, términos y enlaces compartidos"
                    pink
                  />
                  <SignalCard
                    icon={<Share2 size={18} aria-hidden />}
                    label="Compartidos sociales"
                    value={formatLargeNumber(marketing.mixpanelSocialShares30d)}
                    helper="Canjes y desafíos compartidos en Instagram"
                  />
                  <SignalCard
                    icon={<CalendarCheck2 size={18} aria-hidden />}
                    label="Solicitudes de reserva"
                    value={formatLargeNumber(marketing.mixpanelReservationRequests30d)}
                    helper="Reservas iniciadas desde la app"
                    pink
                  />
                  <SignalCard
                    icon={<MousePointerClick size={18} aria-hidden />}
                    label="Contactos de reserva"
                    value={formatLargeNumber(marketing.mixpanelReservationContactOpens30d)}
                    helper="Aperturas del canal para coordinar una reserva"
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Panel title="Filtros más usados" helper="Qué criterio activa la audiencia para decidir.">
                    <RankedList rows={translateMarketingRows(marketing.mixpanelFilterTypes)} />
                  </Panel>
                  <Panel title="Premios más vistos" helper="Vistas de detalle en los últimos 30 días completos.">
                    <RankedList rows={marketing.mixpanelTopViewedRewards} />
                  </Panel>
                  <Panel title="Comercios más vistos" helper="Vistas de detalle en los últimos 30 días completos.">
                    <RankedList rows={marketing.mixpanelTopViewedPartners} />
                  </Panel>
                </div>

                <div className="mt-4 flex gap-3 rounded-2xl border border-[#F3D4EB] bg-[#FFF8FD] p-4 text-sm leading-6 text-[#59424F]">
                  <Activity className="mt-0.5 shrink-0 text-[#A12B77]" size={18} aria-hidden />
                  <p>
                    Estos datos se consolidan por país y sólo guardan totales y nombres públicos de premios o comercios.
                    {marketing.mixpanelCoverageStartDate && marketing.mixpanelDataThroughDate && (
                      <> Cobertura del <strong>{formatDay(marketing.mixpanelCoverageStartDate)}</strong> al <strong>{formatDay(marketing.mixpanelDataThroughDate)}</strong>.</>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <Panel title="Sincronizando comportamiento de marketing">
                <p className="text-sm leading-6 text-[#59635D]">
                  La conexión con Mixpanel está activa. Esta sección aparecerá cuando termine la primera consolidación de sesiones, navegación e intención.
                </p>
              </Panel>
            )}
          </Section>

          <Section title="Conversión y economía" description="Del uso de la app al canje confirmado y al consumo en el comercio.">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <SignalCard
                icon={<MousePointerClick size={18} aria-hidden />}
                label="Canjeadores 30 días"
                value={formatLargeNumber(recentRedeemers)}
                helper={`${recentConversionRate} de las personas activas llegó al canje`}
              />
              <SignalCard
                icon={<Repeat2 size={18} aria-hidden />}
                label="Canjeadores recurrentes"
                value={formatLargeNumber(repeatRedeemers)}
                helper={`${repeatRate} volvió a canjear al menos una vez`}
                pink
              />
              <SignalCard
                icon={<Megaphone size={18} aria-hidden />}
                label="Compra incremental"
                value={extraPurchaseRate}
                helper={`${formatNumber(data.survey.responses)} respuestas post-canje`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <Panel title="Canjes por mes">
                <div className="h-[280px] w-full">
                  <ClientOnlyChart>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.redemptionTrend} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#E8EDE9" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                      <YAxis tickFormatter={(value) => compactFormatter.format(Number(value))} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => formatMonth(String(label))}
                        formatter={(value) => [formatNumber(Number(value)), 'Canjes']}
                      />
                      <Line type="monotone" dataKey="count" stroke="#0B6B43" strokeWidth={3} dot={{ r: 3, fill: '#0B6B43' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  </ClientOnlyChart>
                </div>
              </Panel>
              <Panel title="Economía del canje" helper="Valor comercial declarado en el premio.">
                <dl className="divide-y divide-[#E8EDE9]">
                  <div className="flex items-end justify-between gap-4 py-3 first:pt-0">
                    <dt className="text-sm text-[#66706B]">Valor promedio</dt>
                    <dd className="text-xl font-bold">{h.averageRedeemedValue == null ? '—' : moneyFormatter.format(h.averageRedeemedValue)}</dd>
                  </div>
                  <div className="flex items-end justify-between gap-4 py-3">
                    <dt className="text-sm text-[#66706B]">Mediana</dt>
                    <dd className="text-xl font-bold">{h.medianRedeemedValue == null ? '—' : moneyFormatter.format(h.medianRedeemedValue)}</dd>
                  </div>
                  <div className="flex items-end justify-between gap-4 py-3">
                    <dt className="text-sm text-[#66706B]">Pasitos promedio</dt>
                    <dd className="text-xl font-bold">{formatNumber(h.averagePasitosSpent)}</dd>
                  </div>
                  <div className="flex items-end justify-between gap-4 py-3">
                    <dt className="text-sm text-[#66706B]">Muestra con valor</dt>
                    <dd className="text-sm font-bold">{formatNumber(h.valueSampleSize)} ({valueCoverage})</dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </Section>

          <Section
            title="Activaciones de marca"
            description="Resultados de desafíos publicados en Pasito: participación, movimiento y amplificación social."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SignalCard icon={<Trophy size={18} aria-hidden />} label="Desafíos" value={formatNumber(challenge.challenges)} helper="Activaciones realizadas" />
              <SignalCard icon={<UsersRound size={18} aria-hidden />} label="Participantes únicos" value={formatLargeNumber(challenge.participantUsers)} helper={`${formatNumber(challenge.participations)} participaciones totales`} pink />
              <SignalCard icon={<Footprints size={18} aria-hidden />} label="Pasos en desafíos" value={formatLargeNumber(challenge.validatedSteps)} helper="Pasos validados dentro de activaciones" />
              <SignalCard icon={<Megaphone size={18} aria-hidden />} label="Shares en Instagram" value={formatNumber(challenge.instagramShares)} helper="Compartidos confirmados desde la app" />
              <SignalCard icon={<Sparkles size={18} aria-hidden />} label="Ganadores" value={formatNumber(challenge.winners)} helper="Personas premiadas" pink />
            </div>
            <Panel title="Resultados por activación" helper="Las activaciones se ordenan por cantidad de participantes." className="mt-4">
              <ChallengeTable rows={challenge.topChallenges} />
            </Panel>
          </Section>

          <Section title="Edades" description={`Edad informada en ${percentage(data.dataCoverage.ageUsers, h.registeredUsers)} de los perfiles.`}>
            <Panel title="Base total vs. personas que canjearon" helper="Cantidad de personas únicas por rango de edad.">
              <div className="h-[320px] w-full">
                <ClientOnlyChart>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#E8EDE9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => compactFormatter.format(Number(value))} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatNumber(Number(value)), String(name)]} />
                    <Bar dataKey="usuarios" name="Base total" fill="#B9D3C3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="canjeadores" name="Personas que canjearon" fill="#0B6B43" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </ClientOnlyChart>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#66706B]">
                <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#B9D3C3]" /> Base total</span>
                <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#0B6B43]" /> Personas que canjearon</span>
              </div>
            </Panel>
          </Section>

          <Section title="Dónde está la audiencia" description={`Ubicación informada en ${percentage(data.dataCoverage.locationUsers, h.registeredUsers)} de los perfiles.`}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title={countryCode === 'UY' ? 'Departamentos' : 'Provincias'}><RankedList rows={data.locations.provinces} /></Panel>
              <Panel title="Ciudades"><RankedList rows={data.locations.cities} /></Panel>
              <Panel title="Barrios"><RankedList rows={data.locations.neighborhoods} /></Panel>
            </div>
          </Section>

          <Section title="Quiénes canjean" description="Perfil agregado de las personas que ya hicieron al menos un canje.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Frecuencia de canje">
                <div className="h-[270px] w-full">
                  <ClientOnlyChart>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.redemptionFrequency} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="#E8EDE9" />
                      <XAxis type="number" tickFormatter={(value) => compactFormatter.format(Number(value))} axisLine={false} tickLine={false} tick={{ fill: '#66706B', fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" width={88} axisLine={false} tickLine={false} tick={{ fill: '#4E5852', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatNumber(Number(value)), 'Personas']} />
                      <Bar dataKey="count" fill="#0B6B43" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </ClientOnlyChart>
                </div>
              </Panel>
              <Panel title="Intereses de canjeadores"><RankedList rows={data.redeemerInterests.slice(0, 10)} /></Panel>
              <Panel title="Barrios de canjeadores"><RankedList rows={data.redeemerNeighborhoods.slice(0, 10)} /></Panel>
            </div>
          </Section>

          <Section title="Gustos y preferencias" description={`Intereses declarados por ${formatNumber(data.dataCoverage.interestUsers)} personas y favoritos guardados en la app.`}>
            <div className="grid gap-4 md:grid-cols-2">
              <Panel title="Intereses declarados"><RankedList rows={data.interests} /></Panel>
              <Panel title="Categorías más guardadas"><RankedList rows={data.favoriteCategories} /></Panel>
            </div>
          </Section>

          <Section title="Qué y dónde canjean" description="Canjes confirmados, agrupados por categoría, premio y comercio.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Categorías canjeadas"><RankedList rows={data.redemptionCategories} /></Panel>
              <Panel title="Comercios con más canjes"><RankedList rows={data.topPartners} /></Panel>
              <Panel title="Compra adicional" helper={`${formatNumber(data.survey.responses)} respuestas a la encuesta post-canje.`}>
                <div className="rounded-lg bg-[#F2F6F1] p-4">
                  <p className="text-4xl font-bold tracking-[-0.04em] text-[#0B6B43]">{extraPurchaseRate}</p>
                  <p className="mt-2 text-sm font-semibold">compró algo adicional</p>
                  <p className="mt-1 text-xs text-[#66706B]">{formatNumber(data.survey.extraPurchases)} respuestas afirmativas</p>
                </div>
                <div className="mt-3 rounded-lg border border-[#E1E8E3] p-4">
                  <p className="text-2xl font-bold">{likedRate}</p>
                  <p className="mt-1 text-xs text-[#66706B]">dijo que le gustó el comercio ({formatNumber(data.survey.likedResponses)} respuestas)</p>
                </div>
              </Panel>
            </div>
            <Panel title="Premios más canjeados" className="mt-4">
              <TopRewardsTable rows={data.topRewards} />
            </Panel>
          </Section>
        </div>

        <footer className="mt-14 rounded-2xl border border-[#DDE6DF] bg-white p-5 text-xs leading-5 text-[#66706B]">
          <p className="font-semibold text-[#004027]">Cómo leer estos datos</p>
          <p className="mt-1 max-w-5xl">
            La base corresponde a perfiles registrados en {data.countryName}. “Activas 30 días” usa la última fecha de actividad registrada.
            DAU es el promedio diario de personas activas en 30 días completos; WAU y MAU son personas únicas en 7 y 30 días completos. El día en curso se excluye.
            Stickiness es DAU promedio dividido MAU. Una “jornada activa” es una persona con apertura y actividad sincronizada ese día; no equivale a una impresión publicitaria.
            Las notificaciones “enviadas” son aceptadas por el proveedor de push y las “aperturas” requieren una interacción registrada.
            Los canjes incluyen únicamente cupones confirmados como usados. Los pasos de desafíos se suman por activación y pueden superponerse si una persona participó en desafíos simultáneos.
            Mixpanel aporta sesiones, duración, primeras aperturas, altas, navegación, intención y vistas de contenido; se guardan sólo agregados por país y nombres públicos de premios o comercios.
            No se infieren impresiones publicitarias ni búsquedas escritas cuando no existe un evento auditable para medirlas.
            Los grupos demográficos o geográficos con menos de 20 personas se omiten.
            No se muestran nombres, emails, teléfonos ni ningún otro dato personal. Pasito no registra género, por eso esa dimensión no aparece.
          </p>
        </footer>
      </div>
    </main>
  )
}
