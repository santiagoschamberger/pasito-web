import type { Metadata } from 'next'
import { LockKeyhole } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sala de datos · Pasito',
  robots: { index: false, follow: false, nocache: true },
}
export default function DataRoomIndexPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F5F7F4] px-5 text-[#171D1A]">
      <div className="max-w-md rounded-xl border border-[#DDE6DF] bg-white p-8 text-center shadow-sm">
        <LockKeyhole className="mx-auto text-[#0B6B43]" size={28} aria-hidden />
        <h1 className="mt-4 text-xl font-bold">Sala de datos privada</h1>
        <p className="mt-2 text-sm leading-6 text-[#66706B]">
          Para ingresar necesitás el enlace y la contraseña que te compartió el equipo de Pasito.
        </p>
      </div>
    </main>
  )
}
