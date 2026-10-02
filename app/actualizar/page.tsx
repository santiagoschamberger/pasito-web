import type { Metadata } from 'next'
import ActualizarClient from './ActualizarClient'

export const metadata: Metadata = {
  title: 'Actualizá Pasito',
  description: 'Descargá la última versión de Pasito desde tu tienda de aplicaciones.',
  openGraph: {
    title: 'Actualizá Pasito',
    description: 'Descargá la última versión de Pasito desde tu tienda de aplicaciones.',
    type: 'website',
  },
}

export default function ActualizarPage() {
  return <ActualizarClient />
}
