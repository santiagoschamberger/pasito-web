import Image from 'next/image'
import type { Metadata } from 'next'
import ChallengeRedirect from './ChallengeRedirect'
import {
  buildChallengeWebUrl,
  normalizeChallengeId,
} from './challenge-link'
import {
  fetchChallengeWithWinners,
  fetchStepBoostForChallenge,
  type ChallengeWinner,
} from '../challenges-data'

type PageProps = {
  params: Promise<{ id: string }>
}

const appStoreUrl =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  'https://apps.apple.com/ar/search?term=pasito'

const playStoreUrl =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=ar.pasito.pasito'

const appStoreId = process.env.NEXT_PUBLIC_APP_STORE_ID

export const dynamic = 'force-dynamic'

function formatBoostWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const challengeId = normalizeChallengeId(id) ?? id.trim()
  const webUrl = buildChallengeWebUrl(challengeId)
  const [challenge, boost] = await Promise.all([
    fetchChallengeWithWinners(challengeId),
    fetchStepBoostForChallenge(challengeId),
  ])
  const title = challenge
    ? `${challenge.title} — Pasito`
    : boost
      ? 'Boost de pasos — Pasito'
      : 'Desafío en Pasito'
  const description = boost
    ? 'Escaneaste el QR. En la app tocá Activar para que tus pasos cuenten extra.'
    : challenge?.isClosed
      ? `Mirá quiénes ganaron en ${challenge.brandName ?? 'Pasito'}.`
      : 'Mirá el desafío y abrí Pasito para participar.'

  const meta: Metadata = {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
    openGraph: { title, description, url: webUrl, type: 'website' },
  }
  if (appStoreId) {
    meta.other = {
      'apple-itunes-app': `app-id=${appStoreId}, app-argument=${webUrl}`,
    }
  }
  return meta
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params
  const challengeId = normalizeChallengeId(id) ?? id.trim()
  const challengeUrl = buildChallengeWebUrl(challengeId)
  const [challenge, boost] = await Promise.all([
    fetchChallengeWithWinners(challengeId),
    fetchStepBoostForChallenge(challengeId),
  ])

  const hasWinners =
    !!challenge &&
    (challenge.physicalWinners.length > 0 || challenge.pasitosWinners.length > 0)
  const startsAt = boost ? new Date(boost.activationStartsAt) : null
  const scheduled =
    !!boost && !!startsAt && !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > Date.now()
  const startLabel = boost ? formatBoostWhen(boost.activationStartsAt) : ''

  const headline = challenge?.title ?? 'Desafío en Pasito'
  const body = boost
    ? scheduled
      ? `El boost arranca el ${startLabel}. El QR ya abre Pasito, pero el x${boost.multiplier} recién se activa cuando toques Activar.`
      : `Escaneaste el QR. Eso no alcanza: en la app tenés que tocar Activar para que tus pasos cuenten x${boost.multiplier}. Si Pasito no abre, actualizá la app.`
    : challenge?.isClosed
      ? hasWinners
        ? 'Desafío terminado — estos son los ganadores'
        : 'Desafío terminado'
      : 'Abrí la app para participar y ver el ranking en vivo.'

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
    >
      <div className="flex flex-col items-center gap-7 w-full max-w-sm">
        <Image
          src="/pasitohorizontal.png"
          alt="Pasito"
          width={112}
          height={38}
          priority
          className="brightness-0 invert"
        />

        <div className="grid gap-2 text-center">
          <p className="text-2xl font-extrabold leading-tight text-white">
            {headline}
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            {body}
          </p>
        </div>

        {hasWinners && challenge ? (
          <div className="w-full grid gap-5">
            {challenge.physicalWinners.length > 0 ? (
              <WinnerGroup title="Primeros premios" winners={challenge.physicalWinners} />
            ) : null}
            {challenge.pasitosWinners.length > 0 ? (
              <WinnerGroup
                title="Ganadores de Pasitos"
                winners={challenge.pasitosWinners}
              />
            ) : null}
          </div>
        ) : null}

        <ChallengeRedirect
          challengeId={challengeId}
          challengeUrl={challengeUrl}
          appStoreUrl={appStoreUrl}
          playStoreUrl={playStoreUrl}
        />
      </div>
    </main>
  )
}

function WinnerGroup({
  title,
  winners,
}: {
  title: string
  winners: ChallengeWinner[]
}) {
  return (
    <div className="grid gap-2">
      <p
        className="text-xs font-extrabold uppercase tracking-wide"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        {title}
      </p>
      <div className="grid gap-2">
        {winners.map((w, i) => (
          <WinnerRow key={`${title}-${i}`} winner={w} index={i} />
        ))}
      </div>
    </div>
  )
}

function WinnerRow({ winner, index }: { winner: ChallengeWinner; index: number }) {
  const subtitle = [
    winner.prizeType === 'physical'
      ? winner.prizeTitle
        ? `Premio: ${winner.prizeTitle}`
        : 'Premio físico'
      : winner.pasitosAwarded > 0
        ? `${winner.pasitosAwarded} Pasitos`
        : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold"
        style={{ background: '#EEFA7A', color: '#0C6B45' }}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">
          {`Ganador/a ${index + 1}`}
        </p>
        {subtitle ? (
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}
