import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchRecentChallenges } from './challenges-data'

const appStoreUrl =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  'https://apps.apple.com/ar/search?term=pasito'

const playStoreUrl =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=ar.pasito.pasito'

const appStoreId = process.env.NEXT_PUBLIC_APP_STORE_ID

const webUrl = 'https://www.pasito.app/challenges'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Desafíos en Pasito',
  description: 'Mirá los desafíos de Pasito y quiénes ganaron los premios.',
  openGraph: {
    title: 'Desafíos en Pasito',
    description: 'Mirá los desafíos de Pasito y quiénes ganaron los premios.',
    url: webUrl,
    type: 'website',
  },
  ...(appStoreId
    ? {
        other: {
          'apple-itunes-app': `app-id=${appStoreId}, app-argument=${webUrl}`,
        },
      }
    : {}),
}

export default async function ChallengesPage() {
  const challenges = await fetchRecentChallenges()

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
            Desafíos en Pasito
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            Mirá los desafíos y quiénes ganaron los premios.
          </p>
        </div>

        {challenges.length > 0 ? (
          <div className="w-full grid gap-2">
            {challenges.map((c) => (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {c.title}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {c.isClosed ? 'Terminado · Ver ganadores' : 'Activo'}
                  </p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>›</span>
              </Link>
            ))}
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
