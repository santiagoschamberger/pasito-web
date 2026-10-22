'use client'

import { FormEvent, useState } from 'react'
import { toast } from 'sonner'

import type { TeamUser } from '@/lib/gestion/schema'
import { api } from '../_components/api'
import { btnPrimary, card, input, label, Shell } from '../_components/ui'

const ROLES = [
  { value: 'admin', label: 'Admin', hint: 'Todo, incluido exportar datos personales y dar permisos' },
  { value: 'equipo', label: 'Equipo', hint: 'Crea y edita eventos' },
  { value: 'lectura', label: 'Lectura', hint: 'Solo mira' },
]

export function TeamClient({ user, initialUsers }: { user: TeamUser & { isAdmin: boolean }; initialUsers: TeamUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const me = users.find((u) => u.email === user.email)
  const [name, setName] = useState(me?.name ?? '')
  const [phone, setPhone] = useState(me?.phone ?? '')
  const [invite, setInvite] = useState({ email: '', name: '', role: 'equipo' })

  async function saveMe(e: FormEvent) {
    e.preventDefault()
    const result = await api<{ users: TeamUser[] }>('/api/gestion/me', { method: 'PATCH', body: { name, phone } })
    setUsers(result.users)
    toast.success('Guardado')
  }

  async function upsert(body: Partial<TeamUser>) {
    const result = await api<{ users: TeamUser[] }>('/api/gestion/users', { body })
    setUsers(result.users)
    toast.success('Guardado')
  }

  return (
    <Shell user={user}>
      <h1 className="mb-6 text-[28px] leading-[34px] font-extrabold">Equipo</h1>
      <div className="grid gap-[18px] lg:grid-cols-[1fr_2fr]">
        <div className="space-y-[18px]">
          <form onSubmit={saveMe} className={`${card} space-y-3 p-4`}>
            <h2 className="font-bold">Mis datos</h2>
            <label className="block space-y-1"><span className={label}>Nombre</span><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block space-y-1"><span className={label}>Teléfono (para que la puerta te llame)</span><input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 …" /></label>
            <button className={btnPrimary}>Guardar</button>
          </form>
          {user.isAdmin && (
            <form onSubmit={(e) => { e.preventDefault(); void upsert(invite as Partial<TeamUser>).then(() => setInvite({ email: '', name: '', role: 'equipo' })) }} className={`${card} space-y-3 p-4`}>
              <h2 className="font-bold">Dar acceso</h2>
              <p className="text-sm text-[#5F6761]">Cualquier mail @pasito.app ya entra como Equipo. Acá podés sumar a alguien externo (productora, socio) o cambiar roles.</p>
              <label className="block space-y-1"><span className={label}>Email</span><input className={input} type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></label>
              <label className="block space-y-1"><span className={label}>Nombre</span><input className={input} value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /></label>
              <label className="block space-y-1"><span className={label}>Rol</span>
                <select className={input} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
              </label>
              <button className={btnPrimary}>Guardar</button>
            </form>
          )}
        </div>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E8EDE9] bg-[#F8FAF8] text-left text-xs text-[#66706B]"><th className="px-4 py-2">Persona</th><th className="px-4 py-2">Teléfono</th><th className="px-4 py-2">Rol</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-[#E8EDE9] last:border-0">
                  <td className="px-4 py-2.5"><p className="font-semibold">{u.name || u.email}</p><p className="text-xs text-[#5F6761]">{u.email}</p></td>
                  <td className="px-4 py-2.5 text-[#5F6761]">{u.phone || '—'}</td>
                  <td className="px-4 py-2.5">
                    {user.isAdmin && u.email !== user.email ? (
                      <select className={`${input} h-8 w-32`} value={u.role} onChange={(e) => upsert({ email: u.email, role: e.target.value as TeamUser['role'] })}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                    ) : ROLES.find((r) => r.value === u.role)?.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
