import Image from 'next/image'
import type { Metadata } from 'next'
import {
  fetchChallengeWithWinners,
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

// Winners can keep changing right after close; don't cache the page output.
export const dynamic = 'force-dynamic'

function cleanId(raw: string): string {
  return raw.trim()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const webUrl = `https://www.pasito.app/challenges/${encodeURIComponent(cleanId(id))}`
  const challenge = await fetchChallengeWithWinners(cleanId(id))
  const title = challenge ? `${challenge.title} — Pasito` : 'Desafío en Pasito'
  const description = challenge?.isClosed
    ? `Mirá quiénes ganaron en ${challenge.brandName ?? 'Pasito'}.`
    : 'Mirá el desafío y quiénes ganaron los premios en Pasito.'

  const meta: Metadata = {
    title,
    description,
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
  const challenge = await fetchChallengeWithWinners(challengeId)

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
          <p className="text-2xl font-extrabold leading-tight text-white">
            {challenge?.title ?? 'Desafío en Pasito'}
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            {challenge?.isClosed
              ? hasWinners
                ? 'Desafío terminado — estos son los ganadores'
                : 'Desafío terminado'
              : 'Abrí la app para participar y ver el ranking en vivo.'}
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

        <div className="w-full grid gap-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <a
              href={appStoreUrl}
              className="h-11 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              App Store
            </a>
            <a
              href={playStoreUrl}
              className="h-11 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              Google Play
            </a>
          </div>
        </div>
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
    winner.barrio,
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
          {winner.displayName}
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
