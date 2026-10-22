import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

import './gestion.css'

export const metadata: Metadata = {
  title: { default: 'Eventos Pasito', template: '%s · Eventos Pasito' },
  robots: { index: false, follow: false },
  icons: { icon: '/brand/icono-pasitos.svg', apple: '/icon.png' },
}

export const viewport: Viewport = { themeColor: '#006D42' }

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gestion min-h-dvh antialiased">
      {children}
      <Toaster position="bottom-center" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </div>
  )
}
