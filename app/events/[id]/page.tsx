import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildEventLinks, normalizeEventId } from '@/lib/event-links'
import EventOpenButton from './EventOpenButton'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = normalizeEventId((await params).id)
  if (!id) notFound()
  const { publicUrl } = buildEventLinks(id)
  return {
    title: 'Te compartieron un evento en Pasito',
    description: 'Abrí Pasito para ver el evento. Si todavía no tenés una cuenta, descargá la app y registrate.',
    robots: { index: false, follow: false },
    alternates: { canonical: publicUrl },
    openGraph: { title: 'Te compartieron un evento en Pasito', url: publicUrl, type: 'website' },
    other: { 'apple-itunes-app': `app-id=6760863724, app-argument=${publicUrl}` },
  }
}

export default async function EventInvitePage({ params }: PageProps) {
  const id = normalizeEventId((await params).id)
  if (!id) notFound()
  const links = buildEventLinks(id)

  // Event details stay behind the app's authentication and visibility rules.
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)', color: '#FFFFFF' }}>
      <div className="flex w-full max-w-sm flex-col gap-8 text-center">
        <Image src="/pasitohorizontal.png" alt="Pasito" width={112} height={38} priority className="mx-auto brightness-0 invert" />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Te compartieron un evento</h1>
          <p className="text-sm leading-relaxed text-white/85">Abrilo en Pasito para ver los detalles y las entradas disponibles.</p>
        </div>
        <EventOpenButton eventId={id} />
        <div className="space-y-4 border-t border-white/20 pt-6">
          <h2 className="text-base font-semibold">¿Todavía no tenés Pasito?</h2>
          <p className="text-sm leading-relaxed text-white/85">Descargá la app y creá tu cuenta. Después, volvé a este enlace para ver el evento.</p>
          <div className="grid grid-cols-2 gap-3">
            <a href={links.appStoreUrl} className="flex min-h-11 items-center justify-center rounded-full border border-white/30 px-3 text-sm font-semibold">App Store</a>
            <a href={links.playStoreUrl} className="flex min-h-11 items-center justify-center rounded-full border border-white/30 px-3 text-sm font-semibold">Google Play</a>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-white/70">Si ya tenés una cuenta, iniciá sesión en la app para continuar al evento. Desde una computadora, abrí este enlace en tu teléfono.</p>
      </div>
    </main>
  )
}
