import Image from 'next/image'
import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import ChallengeAppLink from '../ChallengeAppLink'
import { buildChallengeUrl, isChallengeId } from '../challenge-link'
import {
  fetchChallengeWithWinners,
  type ChallengeWinner,
} from '../challenges-data'
import { AppDownloadButtons } from '@/components/app-download-buttons'

type PageProps = {
  params: Promise<{ id: string }>
}

const appStoreId = process.env.NEXT_PUBLIC_APP_STORE_ID
const getChallenge = cache(fetchChallengeWithWinners)

// Winners can keep changing right after close; don't cache the page output.
export const dynamic = 'force-dynamic'

function cleanId(raw: string): string {
  return raw.trim()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!isChallengeId(id)) notFound()
  const webUrl = buildChallengeUrl(id)
  const challenge = await getChallenge(cleanId(id))
  const title = challenge ? `${challenge.title} — Pasito` : 'Desafío en Pasito'
  const description = challenge?.isClosed
    ? `Mirá quiénes ganaron en ${challenge.brandName ?? 'Pasito'}.`
    : 'Mirá el desafío y quiénes ganaron los premios en Pasito.'

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
  const challengeId = cleanId(id)
  if (!isChallengeId(challengeId)) notFound()
  const challenge = await getChallenge(challengeId)

  const hasWinners =
    !!challenge &&
    (challenge.physicalWinners.length > 0 || challenge.pasitosWinners.length > 0)

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
          <h1 className="text-2xl font-extrabold leading-tight text-white">
            {challenge?.title ?? 'Desafío en Pasito'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            {challenge?.isClosed
              ? hasWinners
                ? 'Desafío terminado — estos son los ganadores'
                : 'Desafío terminado'
              : 'Abrí la app para participar y ver el ranking en vivo.'}
          </p>
        </div>

        {challenge ? (
          <div className="grid w-full gap-2 text-center">
            <ChallengeAppLink challengeId={challenge.id} isClosed={challenge.isClosed} />
            <p className="text-xs text-white/70">
              {hasWinners
                ? 'También podés ver los resultados acá, sin descargar la app.'
                : 'Si tenés Pasito, abrí el desafío desde tu celular.'}
            </p>
          </div>
        ) : null}

        {challenge?.isClosed && !hasWinners ? (
          <p className="text-center text-sm text-white/80" role="status">
            {challenge.resultsStatus === 'unavailable'
              ? 'No pudimos cargar los resultados. Volvé a intentar en unos minutos o abrí la app.'
              : 'Los ganadores todavía no están publicados. Volvé a consultar en unos minutos.'}
          </p>
        ) : null}

        {hasWinners && challenge ? (
          <section id="ganadores" aria-label="Ganadores del desafío" className="w-full grid gap-5">
            <p className="text-center text-sm font-semibold text-white">
              {challenge.physicalWinners.length + challenge.pasitosWinners.length} ganadores
              {challenge.winnerSelectionMode === 'raffle_top_n' ? ' · Por orden de sorteo' : ''}
            </p>
            {challenge.physicalWinners.length > 0 ? (
              <WinnerGroup title="Ganadores de premios" winners={challenge.physicalWinners} />
            ) : null}
            {challenge.pasitosWinners.length > 0 ? (
              <WinnerGroup
                title="Ganadores de Pasitos"
                winners={challenge.pasitosWinners}
              />
            ) : null}
          </section>
        ) : null}

        <AppDownloadButtons
          deepLinkPath={challenge?.isClosed ? undefined : `/challenges/${challengeId}`}
          autoOpenOnAndroid={challenge?.isClosed === false}
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
      <h2
        className="text-xs font-extrabold uppercase tracking-wide"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        {title}
      </h2>
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
        <p className="text-sm font-semibold text-white break-words">
          {winner.displayName ?? `Ganador/a ${index + 1}`}
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
