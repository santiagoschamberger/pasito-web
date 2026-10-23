'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarDays, CheckSquare, Home, LayoutGrid, LogOut, Users } from 'lucide-react'

import { STATUS_LABEL, type EffectiveStatus } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { api } from './api'

export const card = 'rounded-xl border border-[#E3E8DF] bg-white shadow-[0_1px_2px_rgba(16,42,30,0.04)]'
export const btn = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition active:translate-y-px disabled:opacity-50 disabled:pointer-events-none'
export const btnPrimary = cn(btn, 'bg-[#006D42] text-white hover:bg-[#00573A] shadow-sm')
export const btnLime = cn(btn, 'bg-[#EBFA61] text-[#00402E] hover:bg-[#E0F04F]')
export const btnSecondary = cn(btn, 'border border-[#DDE6DF] bg-white text-[#171D1A] hover:bg-[#F2F6F1]')
export const btnGhost = cn(btn, 'text-[#5F6761] hover:bg-[#EDF2EA] hover:text-[#171D1A]')
export const input = 'h-10 w-full rounded-lg border border-[#DDE6DF] bg-white px-3 text-sm outline-none transition focus:border-[#006D42] focus:ring-2 focus:ring-[#006D42]/15'
export const label = 'text-[13px] font-semibold text-[#5F6761]'

const STATUS_STYLE: Record<EffectiveStatus, string> = {
  idea: 'bg-[#F1F2EE] text-[#5F6761]',
  planificacion: 'bg-[#E8F0FA] text-[#2C5A8A]',
  confirmado: 'bg-[#E3F2E8] text-[#006D42]',
  produccion: 'bg-[#FBF3DA] text-[#806113]',
  en_curso: 'bg-[#EBFA61] text-[#00402E]',
  realizado: 'bg-[#EFEAF8] text-[#5B3F99]',
  cerrado: 'bg-[#E9E9E9] text-[#444]',
  cancelado: 'bg-[#FDECE8] text-[#B14D3B]',
}

export const STATUS_DOT: Record<EffectiveStatus, string> = {
  idea: '#9AA39D',
  planificacion: '#4A7FB8',
  confirmado: '#006D42',
  produccion: '#C49A2D',
  en_curso: '#B7C934',
  realizado: '#7A5CC0',
  cerrado: '#777',
  cancelado: '#B14D3B',
}

export function StatusPill({ status, className }: { status: EffectiveStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', STATUS_STYLE[status], className)}>
      {status === 'en_curso' && <span className="size-1.5 animate-pulse rounded-full bg-[#00402E]" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

const AVATAR_COLORS = ['#006D42', '#4A7FB8', '#C0587E', '#C49A2D', '#7A5CC0', '#2E8C8C', '#B5643C']

export function Avatar({ name, email, size = 28, className }: { name?: string | null; email?: string | null; size?: number; className?: string }) {
  const text = (name || email || '?').trim()
  const initials = text.includes('@')
    ? text[0].toUpperCase()
    : text.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  let hash = 0
  for (const ch of email || text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
      title={name || email || ''}
    >
      {initials}
    </span>
  )
}

// Mide si un logo es casi todo blanco (pensado para fondo oscuro). Si la imagen
// no permite leerse (CORS), queda el fondo claro por defecto.
function useIsLightImage(src?: string | null) {
  const [light, setLight] = useState(false)
  useEffect(() => {
    setLight(false)
    if (!src) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let sum = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 40) continue
          sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
          count += 1
        }
        // Mayormente transparente y lo visible es claro: necesita fondo oscuro.
        setLight(count > 0 && count < size * size * 0.9 && sum / count > 0.82)
      } catch {
        // Canvas bloqueado por CORS.
      }
    }
    img.src = src
  }, [src])
  return light
}

// Logo de marca o portada; si no hay imagen, iniciales sobre color.
export function Logo({ src, name, size = 40, rounded = 'rounded-lg', className }: { src?: string | null; name: string; size?: number; rounded?: string; className?: string }) {
  const light = useIsLightImage(src)
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn('shrink-0 border object-contain p-1', light ? 'border-[#00402E] bg-[#00402E]' : 'border-[#E3E8DF] bg-white', rounded, className)} style={{ width: size, height: size }} />
  }
  return (
    <span className={cn('grid shrink-0 place-items-center bg-[#EDF2EA] font-bold text-[#006D42]', rounded, className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.trim().slice(0, 2).toUpperCase() || '?'}
    </span>
  )
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!iso) return 'Sin fecha'
  return new Date(`${iso.slice(0, 10)}T12:00:00-03:00`).toLocaleDateString('es-AR', opts)
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - Date.parse(iso)) / 1000
  if (diff < 60) return 'recién'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function PasitoMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-green.svg" alt="Pasito" width={86} height={21} className="h-[21px] w-auto" />
      <span className="rounded-md bg-[#EBFA61] px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-[#00402E] uppercase">Eventos</span>
    </span>
  )
}

export function Shell({ user, children, bare }: { user: { name: string | null; email: string; role: string }; children: React.ReactNode; wide?: boolean; bare?: boolean }) {
  const pathname = usePathname()
  const nav = [
    { href: '/gestion', label: 'Inicio', icon: Home, active: pathname === '/gestion' },
    { href: '/gestion/eventos', label: 'Eventos', icon: LayoutGrid, active: pathname.startsWith('/gestion/eventos') || pathname.startsWith('/gestion/series') },
    { href: '/gestion/calendario', label: 'Calendario', icon: CalendarDays, active: pathname.startsWith('/gestion/calendario') },
    { href: '/gestion/tareas', label: 'Tareas', icon: CheckSquare, active: pathname.startsWith('/gestion/tareas') },
    { href: '/gestion/equipo', label: 'Equipo', icon: Users, active: pathname.startsWith('/gestion/equipo') },
  ]
  async function logout() {
    await api('/api/gestion/auth/logout', { method: 'POST' }).catch(() => null)
    window.location.href = '/gestion/login'
  }
  return (
    <div className="min-h-dvh pb-20 lg:pb-0 lg:pl-[236px]">
      {/* Barra lateral (escritorio) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-[#E3E8DF] bg-white lg:flex">
        <Link href="/gestion" className="px-5 pt-6 pb-7"><PasitoMark /></Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={cn('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition', item.active ? 'bg-[#EDF5EE] text-[#006D42]' : 'text-[#5F6761] hover:bg-[#F6F7EF] hover:text-[#171D1A]')}>
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#EDF1EB] p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name={user.name} email={user.email} size={32} />
            <Link href="/gestion/equipo" className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.name || user.email}</span>
              <span className="block truncate text-xs text-[#7A837D]">{user.role === 'admin' ? 'Admin' : user.role === 'lectura' ? 'Solo lectura' : 'Equipo'}</span>
            </Link>
            <button onClick={logout} className="grid size-8 place-items-center rounded-md text-[#7A837D] hover:bg-[#F2F6F1] hover:text-[#171D1A]" title="Salir"><LogOut className="size-4" /></button>
          </div>
        </div>
      </aside>
      {/* Barra superior (celular) */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E3E8DF] bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/gestion"><PasitoMark /></Link>
        <Link href="/gestion/equipo"><Avatar name={user.name} email={user.email} size={30} /></Link>
      </header>
      {bare ? children : <main className="mx-auto max-w-[1200px] px-4 py-4 sm:px-8 sm:py-8">{children}</main>}
      {/* Navegación inferior en el celular */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#E3E8DF] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', item.active ? 'text-[#006D42]' : 'text-[#7A837D]')}>
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 sm:mb-6 sm:items-end">
      <div className="min-w-0">
        <h1 className="g-display text-2xl leading-8 font-extrabold sm:text-[30px] sm:leading-[36px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-[#5F6761] sm:mt-1 sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#D5DDD3] bg-white/60 px-4 py-8 text-center text-sm text-[#5F6761]">
      {icon}
      {children}
    </div>
  )
}
