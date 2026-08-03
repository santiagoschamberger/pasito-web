import type { Metadata } from 'next'
import Image from 'next/image'

import Pasito50Promo from './Pasito50Promo'

export const metadata: Metadata = {
  title: '50 Pasitos de regalo',
  description: 'Descargá Pasito y recibí 50 Pasitos si tu cuenta tiene menos de 5 días.',
  robots: { index: false, follow: false },
}

export default function Pasito50Page() {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#E9FF9F_0,transparent_34%),linear-gradient(180deg,#F8FAF3_0%,#EDF5F0_100%)] px-4 py-7 sm:px-6 sm:py-12">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <header className="flex justify-center">
          <Image
            src="/brand/logo-green.svg"
            alt="Pasito"
            width={158}
            height={52}
            priority
          />
        </header>
        <Pasito50Promo />
      </div>
    </main>
  )
}
