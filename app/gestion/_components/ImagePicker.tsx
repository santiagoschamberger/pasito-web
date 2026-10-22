'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Logo } from './ui'

export async function uploadImage(file: File): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch('/api/gestion/upload', { method: 'POST', body: form })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    toast.error(payload.error || 'No se pudo subir la imagen.')
    return null
  }
  return payload.url as string
}

// Logo clickeable: subir archivo, pegar un link o quitarlo.
export function ImagePicker({ value, name, onChange, disabled, size = 36, rounded = 'rounded-lg', className }: {
  value: string | null
  name: string
  onChange: (url: string | null) => void
  disabled?: boolean
  size?: number
  rounded?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    const url = await uploadImage(file)
    setBusy(false)
    if (url) onChange(url)
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
        className={cn('group relative block', disabled && 'cursor-default')}
        title={disabled ? name : 'Cambiar imagen'}
      >
        {value ? <Logo src={value} name={name} size={size} rounded={rounded} /> : (
          <span className={cn('grid place-items-center border border-dashed border-[#CBD5CC] bg-[#F6F7EF] text-[#9AA39D] transition group-hover:border-[#006D42] group-hover:text-[#006D42]', rounded)} style={{ width: size, height: size }}>
            <ImagePlus style={{ width: size * 0.45, height: size * 0.45 }} />
          </span>
        )}
        {busy && <span className={cn('absolute inset-0 grid place-items-center bg-white/70', rounded)}><Loader2 className="size-4 animate-spin" /></span>}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={(e) => { setOpen(false); void onFile(e.target.files?.[0]); e.target.value = '' }} />
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-[#E3E8DF] bg-white py-1 text-sm shadow-lg">
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-[#F2F6F1]" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Subir imagen</button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-[#F2F6F1]" onClick={() => {
              setOpen(false)
              const url = window.prompt('Pegá el link de la imagen (https://…)', value ?? '')
              if (url && /^https?:\/\//.test(url.trim())) onChange(url.trim())
            }}><Link2 className="size-4" />Pegar link</button>
            {value && <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-[#B14D3B] hover:bg-[#FDECE8]" onClick={() => { setOpen(false); onChange(null) }}><Trash2 className="size-4" />Quitar</button>}
          </div>
        </>
      )}
    </div>
  )
}
