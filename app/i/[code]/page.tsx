import Image from 'next/image'
import type { Metadata } from 'next'
import ReferralRedirect from './ReferralRedirect'
import { buildReferralInviteUrl, normalizeReferralCode } from './referral-link'

type PageProps = {
  params: Promise<{ code: string }>
}

const appStoreUrl =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  'https://apps.apple.com/ar/search?term=pasito'

const playStoreUrl =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=ar.pasito.pasito'

const appStoreId = process.env.NEXT_PUBLIC_APP_STORE_ID

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const cleanCode = normalizeReferralCode(code)
  const inviteUrl = buildReferralInviteUrl(cleanCode)
  const meta: Metadata = {
    title: 'Te invitaron a Pasito',
    description:
      'Aceptá la invitación y ganá 5 Pasitos cuando sumes tu primer Pasito caminando.',
    openGraph: {
      title: 'Te invitaron a Pasito',
      description: 'Vos y tu amigo pueden ganar 5 Pasitos en Pasito.',
      url: inviteUrl,
      type: 'website',
    },
  }

  if (appStoreId) {
    meta.other = {
      'apple-itunes-app': `app-id=${appStoreId}, app-argument=${inviteUrl}`,
    }
  }

  return meta
}

export default async function ReferralInvitePage({ params }: PageProps) {
  const { code } = await params
  const cleanCode = normalizeReferralCode(code)
  const inviteUrl = buildReferralInviteUrl(cleanCode)

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Image
          src="/pasitohorizontal.png"
          alt="Pasito"
          width={112}
          height={38}
          priority
          className="brightness-0 invert"
        />
        <div className="grid gap-3 text-center">
          <p className="text-2xl font-extrabold leading-tight text-white">
            Vos y tu amigo ganan 5 Pasitos
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            El bonus se acredita cuando sumás tu primer Pasito caminando.
          </p>
        </div>
        <ReferralRedirect
          code={cleanCode}
          inviteUrl={inviteUrl}
          appStoreUrl={appStoreUrl}
          playStoreUrl={playStoreUrl}
        />
      </div>
    </main>
  )
}
