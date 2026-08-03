import type { Metadata } from 'next'
import Image from 'next/image'

import { PASITO50_PROMO_URL } from '@/lib/pasito50'

export const metadata: Metadata = {
  title: 'QR Pasito 50',
  description: 'QR imprimible de la campaña Pasito 50.',
  robots: { index: false, follow: false },
}

export default function Pasito50QrPage() {
  return (
    <main className="min-h-[100dvh] bg-[#F7F8F2] px-6 py-10 text-[#0C6B45] print:bg-white print:p-0">
      <section className="mx-auto grid max-w-xl justify-items-center gap-6 rounded-[32px] bg-white p-8 text-center shadow-sm print:shadow-none">
        <Image
          src="/pasitohorizontal.png"
          alt="Pasito"
          width={150}
          height={50}
          priority
        />
        <div className="grid gap-2">
          <h1 className="text-4xl font-extrabold">Ganá 50 Pasitos</h1>
          <p className="text-lg font-semibold">Escaneá y descargá Pasito</p>
          <p className="text-sm text-[#466B5C]">
            Primeras 100 cuentas nuevas (menos de 5 días).
          </p>
        </div>
        <Image
          src="/qr/pasito50.png"
          alt={`QR que abre ${PASITO50_PROMO_URL}`}
          width={420}
          height={420}
          unoptimized
          className="h-auto w-full max-w-[420px]"
        />
        <p className="break-all text-xs font-semibold text-[#466B5C]">
          {PASITO50_PROMO_URL}
        </p>
        <a
          href="/qr/pasito50.png"
          download="pasito50-qr.png"
          className="rounded-full bg-[#0C6B45] px-6 py-3 text-sm font-bold text-white print:hidden"
        >
          Descargar QR
        </a>
      </section>
    </main>
  )
}
