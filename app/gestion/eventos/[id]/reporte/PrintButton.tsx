'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#006D42] px-3.5 text-sm font-semibold text-white">
      <Printer className="size-4" />Imprimir / PDF
    </button>
  )
}
