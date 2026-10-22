'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { formatMoney, personLabel, SECTIONS, type Column, type GestionRow, type RowData, type RowKind, type TeamUser } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { api } from './api'
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
}

const cellBase = 'h-9 w-full min-w-0 rounded-[6px] border border-transparent bg-transparent px-2 text-sm outline-none hover:border-[#DDE6DF] focus:border-[#0B6B43] focus:bg-white focus:ring-2 focus:ring-[#0B6B43]/15 disabled:hover:border-transparent'

function TextCell({ value, onSave, disabled, type = 'text', placeholder, multiline }: { value: string; onSave: (v: string) => void; disabled: boolean; type?: string; placeholder?: string; multiline?: boolean }) {
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
        className={cn(cellBase, 'h-auto min-h-9 resize-y py-2 leading-snug')}
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
      className={cn(cellBase, type === 'money' || type === 'number' ? 'text-right tabular-nums' : '')}
      inputMode={type === 'money' || type === 'number' ? 'decimal' : undefined}
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
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

export function Cell({ column, value, users, disabled, onSave }: { column: Column; value: unknown; users: TeamUser[]; disabled: boolean; onSave: (value: unknown) => void }) {
  switch (column.type) {
    case 'bool':
      return (
        <div className="flex h-9 items-center justify-center">
          <input type="checkbox" className="size-4 accent-[#0B6B43]" checked={value === true} disabled={disabled} onChange={(e) => onSave(e.target.checked)} />
        </div>
      )
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
        <select className={cn(cellBase, 'pr-1')} value={email} disabled={disabled} onChange={(e) => onSave(e.target.value || null)}>
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
          onSave={(v) => onSave(v.replace(/[^\d,-]/g, '') || null)}
        />
      )
    case 'number':
      return <TextCell type="number" value={typeof value === 'number' ? String(value) : ''} disabled={disabled} onSave={(v) => onSave(v || null)} />
    case 'url': {
      const url = typeof value === 'string' ? value : ''
      return (
        <div className="flex items-center gap-1">
          <TextCell value={url} disabled={disabled} placeholder="https://" onSave={(v) => onSave(v || null)} />
          {url && <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-[#0B6B43]"><ExternalLink className="size-4" /></a>}
        </div>
      )
    }
    default:
      return <TextCell value={typeof value === 'string' ? value : value == null ? '' : String(value)} disabled={disabled} placeholder={column.placeholder} multiline={column.type === 'longtext'} onSave={(v) => onSave(v || null)} />
  }
}

export function useRowActions({ eventId, onRowsChange, onSaveState }: Pick<Props, 'eventId' | 'onRowsChange' | 'onSaveState'>) {
  async function save(row: GestionRow, field: string, value: unknown) {
    onRowsChange((rows) => rows.map((r) => (r.id === row.id ? { ...r, data: { ...r.data, [field]: value as RowData[string] } } : r)))
    onSaveState('saving')
    try {
      const result = await api<{ row: GestionRow }>(`/api/gestion/rows/${row.id}`, { method: 'PATCH', body: { field, value } })
      onRowsChange((rows) => rows.map((r) => (r.id === row.id ? result.row : r)))
      onSaveState('saved')
    } catch {
      onRowsChange((rows) => rows.map((r) => (r.id === row.id ? row : r)))
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
      toast('Fila borrada', {
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

export function SectionTable(props: Props) {
  const { kind, rows, users, canEdit, defaults, footer, extraRows, emptyText } = props
  const section = SECTIONS[kind]
  const columns = props.columns ? section.columns.filter((c) => props.columns!.includes(c.key)) : section.columns
  const { save, add, remove } = useRowActions(props)
  const [adding, setAdding] = useState(false)
  const own = rows.filter((r) => r.kind === kind)
  const totals = columns.filter((c) => c.type === 'money').map((c) => [c.key, own.reduce((sum, r) => sum + (typeof r.data[c.key] === 'number' ? (r.data[c.key] as number) : 0), 0)] as const)

  async function addRow() {
    setAdding(true)
    await add(kind, defaults)
    setAdding(false)
    // Foco en la primera celda de la nueva fila.
    requestAnimationFrame(() => {
      const table = document.getElementById(`table-${kind}`)
      const last = table?.querySelector('tbody tr[data-row]:last-of-type input, tbody tr[data-row]:last-of-type select, tbody tr[data-row]:last-of-type textarea') as HTMLElement | null
      last?.focus()
    })
  }

  return (
    <div>
      {own.length === 0 && !extraRows?.length ? (
        <Empty>{emptyText ?? `Todavía no hay ${section.title.toLowerCase()}.`}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#DDE6DF] bg-white">
          <table id={`table-${kind}`} className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E8EDE9] bg-[#F8FAF8] text-left">
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-xs font-semibold whitespace-nowrap text-[#66706B]" style={{ minWidth: c.width }}>{c.label}</th>
                ))}
                {canEdit && <th className="w-9" />}
              </tr>
            </thead>
            <tbody>
              {own.map((row) => (
                <tr key={row.id} data-row className="border-b border-[#E8EDE9] last:border-0 hover:bg-[#FAFBFA]">
                  {columns.map((c) => (
                    <td key={c.key} className="px-1 py-0.5 align-top">
                      <Cell column={c} value={row.data[c.key]} users={users} disabled={!canEdit} onSave={(v) => save(row, c.key, v)} />
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-1 align-top">
                      <button onClick={() => remove(row)} className="grid h-9 w-8 place-items-center text-[#9AA39D] hover:text-[#B14D3B]" title="Borrar"><Trash2 className="size-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
              {extraRows?.map((extra) => (
                <tr key={extra.key} className="border-b border-[#E8EDE9] bg-[#F8FAF8] text-[#5F6761] last:border-0" title={extra.note}>
                  {columns.map((c) => <td key={c.key} className="h-9 px-3 whitespace-nowrap">{extra.cells[c.key] ?? ''}</td>)}
                  {canEdit && <td />}
                </tr>
              ))}
            </tbody>
            {totals.length > 0 && own.length > 1 && (
              <tfoot>
                <tr className="border-t border-[#DDE6DF] bg-[#F8FAF8] font-semibold">
                  {columns.map((c, i) => {
                    const total = totals.find(([key]) => key === c.key)
                    return <td key={c.key} className={cn('h-9 px-3 whitespace-nowrap', total && 'text-right tabular-nums')}>{total ? formatMoney(total[1]) : i === 0 ? 'Total' : ''}</td>
                  })}
                  {canEdit && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {canEdit ? (
          <button className={btnSecondary} onClick={addRow} disabled={adding}><Plus className="size-4" />Agregar {section.singular}</button>
        ) : <span />}
        {footer}
      </div>
    </div>
  )
}
