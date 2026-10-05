import type { Metadata, Viewport } from 'next'

import { PasitoClubLanding } from './PasitoClubLanding'

const TITLE = 'Pasito Club — No buscamos runners. Los vamos a crear.'
const DESCRIPTION = 'De caminar tus primeros metros a correr tus primeros 3K. Sumate a la lista de Pasito Club, Buenos Aires.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pasito.app'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/pasito-club/og.png', width: 1200, height: 630, alt: 'Pasito Club' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#004027',
}

export default function PasitoClubPage() {
  return <PasitoClubLanding />
}
