import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pasito — Caminá, juntá Pasitos y ganá premios',
  description: 'La red que convierte tus pasos en premios en comercios cerca tuyo.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Pasito — Caminá, juntá Pasitos y ganá premios',
    description: 'La red que convierte tus pasos en premios en comercios cerca tuyo.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
