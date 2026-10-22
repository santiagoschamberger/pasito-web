'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { formatMoney, personLabel, SECTIONS, type Column, type GestionRow, type RowData, type RowKind, type TeamUser } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { api } from './api'
import { ImagePicker } from './ImagePicker'
import { btnSecondary, Empty } from './ui'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  eventId: string
  kind: RowKind
  rows: GestionRow[]
  users: TeamUser[]
  canEdit: boolean
  onRowsChange: (updater: (rows: GestionRow[]) => GestionRow[]) => void
  onSaveState: (state: SaveState) => void
  defaults?: RowData
  columns?: string[]
  footer?: React.ReactNode
  extraRows?: { key: string; cells: Record<string, React.ReactNode>; note: string }[]
  emptyText?: string
  addLabel?: string
  currency?: string
}

const cellBase = 'h-9 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none hover:border-[#DDE6DF] focus:border-[#006D42] focus:bg-white focus:ring-2 focus:ring-[#006D42]/15 disabled:hover:border-transparent'

function TextCell({ value, onSave, disabled, type = 'text', placeholder, multiline, className }: { value: string; onSave: (v: string) => void; disabled: boolean; type?: string; placeholder?: string; multiline?: boolean; className?: string }) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])
  const commit = () => {
    focused.current = false
    if (draft !== value) onSave(draft)
  }
  if (multiline) {
    return (
      <textarea
        className={cn(cellBase, 'h-auto min-h-9 resize-y py-2 leading-snug', className)}
        rows={1}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => (focused.current = true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <input
      className={cn(cellBase, type === 'money' || type === 'number' ? 'text-right tabular-nums' : '', className)}
      inputMode={type === 'money' || type === 'number' ? 'decimal' : undefined}
      value={draft}
      disabled={disabled}
      placeholder={disabled ? '' : placeholder}
      onFocus={(e) => {
        focused.current = true
        if (type === 'money') e.target.select()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(value)
          focused.current = false
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

export function Cell({ column, value, users, disabled, onSave, rowName }: { column: Column; value: unknown; users: TeamUser[]; disabled: boolean; onSave: (value: unknown) => void; rowName?: string }) {
  switch (column.type) {
    case 'bool':
      return (
        <div className="flex h-9 items-center justify-center">
          <input type="checkbox" className="size-4 accent-[#006D42]" checked={value === true} disabled={disabled} onChange={(e) => onSave(e.target.checked)} />
        </div>
      )
    case 'image':
      return <div className="flex h-10 items-center justify-center"><ImagePicker value={typeof value === 'string' ? value : null} name={rowName || 'Logo'} disabled={disabled} onChange={(url) => onSave(url)} /></div>
    case 'select':
      return (
        <select className={cn(cellBase, 'pr-1')} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={(e) => onSave(e.target.value || null)}>
          <option value="">—</option>
          {column.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    case 'person': {
      const email = typeof value === 'string' ? value : ''
      return (
        <select className={cn(cellBase, 'pr-1', !email && 'text-[#9AA39D]')} value={email} disabled={disabled} onChange={(e) => onSave(e.target.value || null)}>
          <option value="">Sin asignar</option>
          {users.map((u) => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
          {email && !users.some((u) => u.email === email) && <option value={email}>{personLabel(email, users)}</option>}
        </select>
      )
    }
    case 'date':
      return <input type="date" className={cellBase} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={(e) => onSave(e.target.value || null)} />
    case 'money':
      return (
        <TextCell
          type="money"
          value={typeof value === 'number' ? value.toLocaleString('es-AR') : ''}
          disabled={disabled}
          placeholder="$"
          onSave={(v) => onSave(v.replace(/[^\d.,-]/g, '') || null)}
        />
      )
    case 'number':
      return <TextCell type="number" value={typeof value === 'number' ? value.toLocaleString('es-AR', { maximumFractionDigits: 4 }) : ''} disabled={disabled} onSave={(v) => onSave(v || null)} />
    case 'url': {
      const url = typeof value === 'string' ? value : ''
      return (
        <div className="flex items-center gap-1">
          <TextCell value={url} disabled={disabled} placeholder="https://" onSave={(v) => onSave(v || null)} />
          {url && <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-[#006D42]"><ExternalLink className="size-4" /></a>}
        </div>
      )
    }
    default:
      return <TextCell value={typeof value === 'string' ? value : value == null ? '' : String(value)} disabled={disabled} placeholder={column.placeholder ?? (column.key === 'titulo' || column.key === 'item' ? 'Escribí acá…' : undefined)} multiline={column.type === 'longtext'} onSave={(v) => onSave(v || null)} />
  }
}

export function rowName(row: GestionRow): string {
  const d = row.data
  return String(d.titulo || d.concepto || d.marca || d.proveedor || d.persona || d.item || d.nombre || d.tramite || '')
}

export function useRowActions({ eventId, onRowsChange, onSaveState }: Pick<Props, 'eventId' | 'onRowsChange' | 'onSaveState'>) {
  async function save(row: GestionRow, field: string, value: unknown) {
    const previous = row.data[field]
    const setField = (v: unknown) => onRowsChange((rows) => rows.map((r) => (r.id === row.id ? { ...r, data: { ...r.data, [field]: v as RowData[string] } } : r)))
    setField(value)
    onSaveState('saving')
    try {
      const result = await api<{ row: GestionRow }>(`/api/gestion/rows/${row.id}`, { method: 'PATCH', body: { field, value } })
      // Solo este campo: no pisa otros guardados en curso de la misma fila.
      setField(result.row.data[field])
      onSaveState('saved')
    } catch {
      setField(previous)
      onSaveState('error')
    }
  }

  async function add(kind: RowKind, data: RowData = {}) {
    onSaveState('saving')
    try {
      const result = await api<{ row: GestionRow }>(`/api/gestion/events/${eventId}/rows`, { body: { kind, data } })
      onRowsChange((rows) => [...rows, result.row])
      onSaveState('saved')
      return result.row
    } catch {
      onSaveState('error')
      return null
    }
  }

  async function remove(row: GestionRow) {
    onRowsChange((rows) => rows.filter((r) => r.id !== row.id))
    try {
      await api(`/api/gestion/rows/${row.id}`, { method: 'DELETE' })
      toast(`Borraste “${rowName(row) || 'la fila'}”`, {
        duration: 8000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await api(`/api/gestion/rows/${row.id}`, { method: 'PATCH', body: { restore: true } })
            onRowsChange((rows) => [...rows, row].sort((a, b) => a.position - b.position))
          },
        },
      })
    } catch {
      onRowsChange((rows) => [...rows, row].sort((a, b) => a.position - b.position))
    }
  }

  return { save, add, remove }
}

function DoneToggle({ done, disabled, onToggle }: { done: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={done ? 'Marcar pendiente' : 'Marcar hecha'}
      className={cn('grid size-6 place-items-center rounded-full border-2 transition', done ? 'border-[#006D42] bg-[#006D42] text-white' : 'border-[#C3CCC5] text-transparent hover:border-[#006D42] hover:text-[#006D42]')}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </button>
  )
}

export function SectionTable(props: Props) {
  const { kind, rows, users, canEdit, defaults, footer, extraRows, emptyText } = props
  const section = SECTIONS[kind]
  const columns = props.columns ? section.columns.filter((c) => props.columns!.includes(c.key)) : section.columns
  const { save, add, remove } = useRowActions(props)
  const [adding, setAdding] = useState(false)
  const mobile = useIsMobile()
  const isTask = kind === 'task'
  const own = rows.filter((r) => r.kind === kind)
  // Las tareas hechas bajan al final.
  const ordered = isTask ? [...own].sort((a, b) => Number(a.data.estado === 'hecha') - Number(b.data.estado === 'hecha')) : own
  const totals = columns.filter((c) => c.type === 'money').map((c) => [c.key, own.reduce((sum, r) => sum + (typeof r.data[c.key] === 'number' ? (r.data[c.key] as number) : 0), 0)] as const)
  const toggleDone = (row: GestionRow) => save(row, 'estado', row.data.estado === 'hecha' ? 'pendiente' : 'hecha')

  async function addRow() {
    setAdding(true)
    await add(kind, defaults)
    setAdding(false)
    requestAnimationFrame(() => {
      const container = document.getElementById(`table-${kind}`)
      const last = container?.querySelectorAll('[data-row]')
      const target = last?.[last.length - 1]?.querySelector('input:not([type=checkbox]), textarea, select') as HTMLElement | null
      target?.focus()
    })
  }

  const addButton = canEdit ? (
    <button className={btnSecondary} onClick={addRow} disabled={adding}><Plus className="size-4" />{props.addLabel ?? `Agregar ${section.singular}`}</button>
  ) : <span />

  if (own.length === 0 && !extraRows?.length) {
    return (
      <div className="space-y-2">
        <Empty>{emptyText ?? `Todavía no hay ${section.title.toLowerCase()}.`}</Empty>
        <div className="flex flex-wrap items-center justify-between gap-2">{addButton}{footer}</div>
      </div>
    )
  }

  if (mobile) {
    // En el celular cada fila es una tarjeta: nada de scroll horizontal.
    const [main, ...rest] = columns.filter((c) => c.type !== 'image' && !(isTask && c.key === 'estado'))
    const image = columns.find((c) => c.type === 'image')
    return (
      <div id={`table-${kind}`} className="space-y-2">
        {ordered.map((row) => {
          const done = isTask && row.data.estado === 'hecha'
          return (
            <div key={row.id} data-row className={cn('rounded-xl border border-[#E3E8DF] bg-white p-3', done && 'opacity-60')}>
              <div className="flex items-start gap-2">
                {isTask && <div className="pt-1.5"><DoneToggle done={done} disabled={!canEdit} onToggle={() => toggleDone(row)} /></div>}
                {image && <Cell column={image} value={row.data[image.key]} users={users} disabled={!canEdit} rowName={rowName(row)} onSave={(v) => save(row, image.key, v)} />}
                <div className={cn('min-w-0 flex-1 font-semibold', done && 'line-through')}>
                  <Cell column={main} value={row.data[main.key]} users={users} disabled={!canEdit} onSave={(v) => save(row, main.key, v)} />
                </div>
                {canEdit && <button onClick={() => remove(row)} className="grid size-9 place-items-center text-[#9AA39D]"><Trash2 className="size-4" /></button>}
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-2">
                {rest.map((c) => (
                  <div key={c.key} className={cn('min-w-0', c.type === 'longtext' && 'col-span-2')}>
                    <dt className="px-2 pt-1 text-[11px] font-semibold text-[#7A837D]">{c.label}</dt>
                    <dd><Cell column={c} value={row.data[c.key]} users={users} disabled={!canEdit} rowName={rowName(row)} onSave={(v) => save(row, c.key, v)} /></dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
        {extraRows?.map((extra) => (
          <div key={extra.key} className="rounded-xl border border-dashed border-[#D5DDD3] bg-[#F6F7EF] p-3 text-sm text-[#5F6761]">
            <p className="font-semibold">{extra.cells.concepto}</p>
            <p>{extra.cells.tipo} · {extra.cells.presupuestado} · {extra.cells.estado}</p>
            <p className="text-xs">{extra.note}</p>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">{addButton}{footer}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#E3E8DF] bg-white">
        <table id={`table-${kind}`} className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#EDF1EB] bg-[#FAFBF7] text-left">
              {isTask && <th className="w-10" />}
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2.5 text-xs font-bold whitespace-nowrap text-[#66706B]" style={{ minWidth: c.width }}>{c.label}</th>
              ))}
              {canEdit && <th className="w-9" />}
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => {
              const done = isTask && row.data.estado === 'hecha'
              return (
                <tr key={row.id} data-row className={cn('group border-b border-[#EDF1EB] last:border-0 hover:bg-[#FAFBF7]', done && 'opacity-55')}>
                  {isTask && <td className="pl-3 align-middle"><DoneToggle done={done} disabled={!canEdit} onToggle={() => toggleDone(row)} /></td>}
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn('px-1 py-0.5 align-top', done && i === 0 && 'line-through')}>
                      <Cell column={c} value={row.data[c.key]} users={users} disabled={!canEdit} rowName={rowName(row)} onSave={(v) => save(row, c.key, v)} />
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-1 align-top">
                      <button onClick={() => remove(row)} className="grid h-9 w-8 place-items-center text-[#B9C1BB] opacity-0 transition group-hover:opacity-100 hover:text-[#B14D3B] focus:opacity-100" title="Borrar"><Trash2 className="size-4" /></button>
                    </td>
                  )}
                </tr>
              )
            })}
            {extraRows?.map((extra) => (
              <tr key={extra.key} className="border-b border-[#EDF1EB] bg-[#F6F7EF] text-[#5F6761] last:border-0" title={extra.note}>
                {isTask && <td />}
                {columns.map((c) => <td key={c.key} className="h-9 px-3 whitespace-nowrap">{extra.cells[c.key] ?? ''}</td>)}
                {canEdit && <td />}
              </tr>
            ))}
          </tbody>
          {totals.length > 0 && own.length + (extraRows?.length ?? 0) > 1 && (
            <tfoot>
              <tr className="border-t border-[#DDE6DF] bg-[#FAFBF7] font-bold">
                {isTask && <td />}
                {columns.map((c, i) => {
                  const total = totals.find(([key]) => key === c.key)
                  return <td key={c.key} className={cn('h-10 px-3 whitespace-nowrap', total && 'text-right tabular-nums')}>{total ? formatMoney(total[1], props.currency) : i === 0 ? 'Total cargado' : ''}</td>
                })}
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">{addButton}{footer}</div>
    </div>
  )
}
