'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, LogOut, Users } from 'lucide-react'

import { STATUS_LABEL, type EffectiveStatus } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { api } from './api'

export const card = 'rounded-lg border border-[#DDE6DF] bg-white'
export const btn = 'inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[7px] px-3.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none'
export const btnPrimary = cn(btn, 'bg-[#0B6B43] text-white hover:bg-[#095a38]')
export const btnSecondary = cn(btn, 'border border-[#DDE6DF] bg-white text-[#171D1A] hover:bg-[#F2F6F1]')
export const btnGhost = cn(btn, 'text-[#5F6761] hover:bg-[#F2F6F1] hover:text-[#171D1A]')
export const input = 'h-[38px] w-full rounded-[7px] border border-[#DDE6DF] bg-white px-3 text-sm outline-none focus:border-[#0B6B43] focus:ring-2 focus:ring-[#0B6B43]/15'
export const label = 'text-[13px] font-semibold text-[#5F6761]'

const STATUS_STYLE: Record<EffectiveStatus, string> = {
  idea: 'bg-[#F8FAF8] text-[#5F6761] border-[#DDE6DF]',
  planificacion: 'bg-[#EEF4FB] text-[#2C5A8A] border-[#D5E3F2]',
  confirmado: 'bg-[#F2F6F1] text-[#0B6B43] border-[#CFE3D6]',
  produccion: 'bg-[#FBF8EE] text-[#806113] border-[#EFE3BF]',
  en_curso: 'bg-[#0B6B43] text-white border-[#0B6B43]',
  realizado: 'bg-[#F3F0FA] text-[#5B3F99] border-[#E1D9F2]',
  cerrado: 'bg-[#EEEEEE] text-[#444] border-[#DDD]',
  cancelado: 'bg-[#FFF6F4] text-[#B14D3B] border-[#F2D6CF]',
}

export function StatusPill({ status }: { status: EffectiveStatus }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
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

export function Shell({ user, children }: { user: { name: string | null; email: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname()
  const nav = [
    { href: '/gestion', label: 'Inicio', icon: Home, active: pathname === '/gestion' },
    { href: '/gestion/eventos', label: 'Eventos', icon: CalendarDays, active: pathname.startsWith('/gestion/eventos') },
    { href: '/gestion/equipo', label: 'Equipo', icon: Users, active: pathname.startsWith('/gestion/equipo') },
  ]
  async function logout() {
    await api('/api/gestion/auth/logout', { method: 'POST' }).catch(() => null)
    window.location.href = '/gestion/login'
  }
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[#DDE6DF] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1344px] items-center gap-2 px-4 sm:px-6">
          <Link href="/gestion" className="mr-2 flex items-center gap-2 font-extrabold text-[#0B6B43]">
            <span className="grid size-7 place-items-center rounded-md bg-[#0B6B43] text-sm text-[#EBFA61]">P</span>
            <span className="hidden sm:inline">Eventos</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={cn('flex h-9 items-center gap-1.5 rounded-[7px] px-2.5 text-sm font-semibold', item.active ? 'bg-[#F2F6F1] text-[#0B6B43]' : 'text-[#5F6761] hover:text-[#171D1A]')}>
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm text-[#5F6761] md:inline">{user.name || user.email}{user.role === 'lectura' ? ' · lectura' : ''}</span>
          <button onClick={logout} className={btnGhost} title="Salir"><LogOut className="size-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-[1344px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[#DDE6DF] px-4 py-8 text-center text-sm text-[#5F6761]">{children}</div>
}
