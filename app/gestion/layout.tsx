import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: { default: 'Eventos Pasito', template: '%s · Eventos Pasito' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#0B6B43' }

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F6F7F4] font-[system-ui,sans-serif] text-[#171D1A] antialiased">
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
