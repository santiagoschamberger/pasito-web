import Image from 'next/image'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

type DonePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata = {
  title: 'Reserva procesada — Pasito',
}

export default async function DonePage({ searchParams }: DonePageProps) {
  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : ''

  const variants: Record<string, {
    icon: React.ReactNode
    title: string
    body: string
    accent: string
  }> = {
    confirmed: {
      icon: <CheckCircle2 size={40} style={{ color: '#EEFA7A' }} />,
      title: '¡Reserva confirmada!',
      body: 'El cliente fue notificado. Los pasitos se descontaron de su balance.',
      accent: '#EEFA7A',
    },
    rejected: {
      icon: <XCircle size={40} style={{ color: '#ff9999' }} />,
      title: 'Reserva rechazada',
      body: 'Los pasitos fueron devueltos al cliente y fue notificado.',
      accent: '#ff9999',
    },
    error: {
      icon: <AlertTriangle size={40} style={{ color: '#ffcc66' }} />,
      title: 'Algo salió mal',
      body: 'No pudimos procesar la acción. Es posible que la reserva ya haya sido procesada o haya vencido.',
      accent: '#ffcc66',
    },
  }

  const v = variants[status] ?? variants.error!

  return (
    <main
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
    >
      <div className="shrink-0 flex justify-center pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <Image
          src="/pasitohorizontal.png"
          alt="Pasito"
          width={90}
          height={30}
          priority
          className="brightness-0 invert"
        />
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5 w-full max-w-sm mx-auto">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${v.accent}22` }}
        >
          {v.icon}
        </div>

        <h1 className="text-3xl leading-tight font-display" style={{ color: v.accent }}>
          {v.title}
        </h1>

        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {v.body}
        </p>
      </section>

      <footer className="shrink-0 flex justify-center text-[10px] pb-[max(env(safe-area-inset-bottom),12px)] pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        pasito.app
      </footer>
    </main>
  )
}
