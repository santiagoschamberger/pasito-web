// Parser de CSV tolerante (coma, punto y coma o tab; comillas) y mapeo de
// columnas típicas de ticketeras (Venti, Passline, Eventbrite, planillas propias).

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>
  for (const ch of firstLine) if (ch in counts) counts[ch] += 1
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

type Mapped = { name: string; email?: string; phone?: string; dni_last3?: string; companions?: number; notes?: string; origin_ref?: string; kind?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export function mapAttendeeRows(rows: string[][]): { items: Mapped[]; columns: Record<string, string> } {
  if (rows.length === 0) return { items: [], columns: {} }
  const header = rows[0].map(norm)
  const find = (...patterns: RegExp[]) => header.findIndex((h) => patterns.some((p) => p.test(h)))
  const idx = {
    full: find(/^(nombre y apellido|nombre completo|full ?name|asistente|titular|name)$/),
    first: find(/^(nombre|first ?name|nombres)$/),
    last: find(/^(apellido|last ?name|apellidos)$/),
    email: find(/e-?mail|correo|^mail$/),
    phone: find(/tel|phone|celular|whats/),
    dni: find(/dni|documento|doc\b/),
    companions: find(/acompa|\+1|invitados extra|plus/),
    notes: find(/nota|observ|comentario/),
    ref: find(/ticket|entrada|orden|order|codigo|code|^id$/),
    kind: find(/^tipo|categoria|kind/),
  }
  const hasHeader = idx.full >= 0 || idx.first >= 0 || idx.email >= 0
  const body = hasHeader ? rows.slice(1) : rows
  if (!hasHeader) idx.full = 0

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
  const items = body
    .map((r) => {
      const name = get(r, idx.full) || [get(r, idx.first), get(r, idx.last)].filter(Boolean).join(' ')
      const kindRaw = norm(get(r, idx.kind))
      const kind = ['invitado', 'prensa', 'sponsor', 'staff', 'general'].find((k) => kindRaw.includes(k))
      return {
        name,
        email: get(r, idx.email) || undefined,
        phone: get(r, idx.phone) || undefined,
        dni_last3: get(r, idx.dni).replace(/\D/g, '').slice(-3) || undefined,
        companions: Number(get(r, idx.companions).replace(/\D/g, '')) || undefined,
        notes: get(r, idx.notes) || undefined,
        origin_ref: get(r, idx.ref) || undefined,
        kind,
      }
    })
    .filter((item) => item.name)

  const columns: Record<string, string> = {}
  for (const [key, i] of Object.entries(idx)) if (i >= 0 && hasHeader) columns[key] = rows[0][i]
  return { items, columns }
}
