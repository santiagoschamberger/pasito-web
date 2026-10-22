// Esquema compartido (cliente y servidor) de Eventos Pasito.
// Cada sección de un evento es una lista de filas `gestion_rows` con `kind` y
// `data` jsonb; acá se define qué columnas tiene cada una.

export type EventStatus =
  | 'idea'
  | 'planificacion'
  | 'confirmado'
  | 'produccion'
  | 'realizado'
  | 'cerrado'
  | 'cancelado'

export type EffectiveStatus = EventStatus | 'en_curso'

export const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'planificacion', label: 'Planificación' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'produccion', label: 'En producción' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export const STATUS_LABEL: Record<EffectiveStatus, string> = {
  ...Object.fromEntries(EVENT_STATUSES.map((s) => [s.value, s.label])),
  en_curso: 'En curso',
} as Record<EffectiveStatus, string>

export type EventType = 'activacion' | 'fiesta' | 'corporativo' | 'caminata' | 'otro'

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'activacion', label: 'Activación con comercios' },
  { value: 'fiesta', label: 'Fiesta / recital' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'caminata', label: 'Caminata / running' },
  { value: 'otro', label: 'Otro' },
]

export type GestionEvent = {
  id: string
  name: string
  type: EventType
  status: EventStatus
  start_date: string | null
  start_time: string | null
  end_date: string | null
  venue: string | null
  city: string | null
  capacity: number | null
  owner_email: string | null
  drive_url: string | null
  objective: string | null
  notes: string | null
  pasito_event_ids: string[]
  door_allow_walkins: boolean
  door_allow_reentry: boolean
  archived_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const EVENT_EDITABLE_FIELDS = [
  'name',
  'type',
  'status',
  'start_date',
  'start_time',
  'end_date',
  'venue',
  'city',
  'capacity',
  'owner_email',
  'drive_url',
  'objective',
  'notes',
  'pasito_event_ids',
  'door_allow_walkins',
  'door_allow_reentry',
] as const

export type RowKind =
  | 'budget'
  | 'sponsor'
  | 'vendor'
  | 'task'
  | 'team'
  | 'learning'
  | 'checklist'
  | 'kpi'
  | 'contact'
  | 'permit'

export type RowData = Record<string, string | number | boolean | null | undefined>

export type GestionRow = {
  id: string
  event_id: string
  kind: RowKind
  data: RowData
  position: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ColumnType = 'text' | 'longtext' | 'money' | 'number' | 'date' | 'select' | 'person' | 'bool' | 'url'

export type Column = {
  key: string
  label: string
  type: ColumnType
  options?: { value: string; label: string }[]
  width?: number
  placeholder?: string
}

const opts = (...values: [string, string][]) => values.map(([value, label]) => ({ value, label }))

export const BUDGET_CATEGORIES = opts(
  ['venue', 'Venue'],
  ['produccion', 'Producción'],
  ['tecnica', 'Técnica / sonido'],
  ['catering', 'Catering / barra'],
  ['comunicacion', 'Comunicación'],
  ['personal', 'Personal / staff'],
  ['permisos', 'Permisos / seguros'],
  ['merch', 'Merch / premios'],
  ['logistica', 'Logística'],
  ['entradas', 'Entradas'],
  ['otros', 'Otros'],
)

export const SPONSOR_STAGES = opts(
  ['contacto', 'Primer contacto'],
  ['propuesta', 'Propuesta enviada'],
  ['negociacion', 'Negociación'],
  ['confirmado', 'Confirmado'],
  ['cobrado', 'Cobrado'],
  ['caido', 'Caído / incobrable'],
)

export const TASK_STATES = opts(['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['bloqueada', 'Bloqueada'], ['hecha', 'Hecha'])

export const AREAS = opts(
  ['produccion', 'Producción'],
  ['comercial', 'Comercial'],
  ['comunicacion', 'Comunicación'],
  ['finanzas', 'Finanzas'],
  ['producto', 'Producto / app'],
  ['legales', 'Legales'],
)

const CONTRACT = opts(['no', 'Sin contrato'], ['enviado', 'Enviado'], ['firmado', 'Firmado'])

export const SECTIONS: Record<RowKind, { title: string; singular: string; columns: Column[] }> = {
  budget: {
    title: 'Presupuesto',
    singular: 'línea',
    columns: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: opts(['egreso', 'Gasto'], ['ingreso', 'Ingreso']), width: 100 },
      { key: 'categoria', label: 'Categoría', type: 'select', options: BUDGET_CATEGORIES, width: 140 },
      { key: 'concepto', label: 'Concepto', type: 'text', width: 220 },
      { key: 'presupuestado', label: 'Presupuestado', type: 'money', width: 130 },
      { key: 'real', label: 'Real', type: 'money', width: 120 },
      { key: 'estado', label: 'Estado', type: 'select', options: opts(['pendiente', 'Pendiente'], ['senado', 'Señado'], ['pagado', 'Pagado'], ['cobrado', 'Cobrado']), width: 120 },
      { key: 'vence', label: 'Vence', type: 'date', width: 140 },
      { key: 'responsable', label: 'Responsable', type: 'person', width: 160 },
      { key: 'medio', label: 'Medio', type: 'text', width: 120 },
      { key: 'comprobante', label: 'Comprobante', type: 'url', width: 160 },
    ],
  },
  sponsor: {
    title: 'Sponsors',
    singular: 'sponsor',
    columns: [
      { key: 'marca', label: 'Marca', type: 'text', width: 180 },
      { key: 'etapa', label: 'Etapa', type: 'select', options: SPONSOR_STAGES, width: 160 },
      { key: 'nivel', label: 'Nivel', type: 'select', options: opts(['principal', 'Principal'], ['oro', 'Oro'], ['plata', 'Plata'], ['apoyo', 'Apoyo']), width: 110 },
      { key: 'dinero', label: 'Aporte $', type: 'money', width: 130 },
      { key: 'canje', label: 'Canje (valor)', type: 'money', width: 130 },
      { key: 'detalle_canje', label: 'Detalle canje', type: 'text', width: 180 },
      { key: 'contraprestaciones', label: 'Contraprestaciones', type: 'longtext', width: 220 },
      { key: 'contrato', label: 'Contrato', type: 'select', options: CONTRACT, width: 120 },
      { key: 'facturado', label: 'Facturado', type: 'bool', width: 90 },
      { key: 'fecha_cobro', label: 'Fecha cobro', type: 'date', width: 140 },
      { key: 'responsable', label: 'Responsable', type: 'person', width: 160 },
      { key: 'contacto', label: 'Contacto', type: 'text', width: 180 },
    ],
  },
  vendor: {
    title: 'Proveedores',
    singular: 'proveedor',
    columns: [
      { key: 'proveedor', label: 'Proveedor', type: 'text', width: 180 },
      { key: 'servicio', label: 'Servicio', type: 'text', width: 180 },
      { key: 'total', label: 'Total', type: 'money', width: 120 },
      { key: 'sena', label: 'Seña', type: 'money', width: 110 },
      { key: 'sena_pagada', label: 'Seña paga', type: 'bool', width: 90 },
      { key: 'saldo_pagado', label: 'Saldo pago', type: 'bool', width: 90 },
      { key: 'fecha_pago', label: 'Pagar saldo', type: 'date', width: 140 },
      { key: 'llegada', label: 'Llegada', type: 'text', width: 100, placeholder: '18:30' },
      { key: 'contrato', label: 'Contrato', type: 'select', options: CONTRACT, width: 120 },
      { key: 'cuit', label: 'CUIT', type: 'text', width: 130 },
      { key: 'contacto', label: 'Contacto', type: 'text', width: 180 },
    ],
  },
  task: {
    title: 'Tareas',
    singular: 'tarea',
    columns: [
      { key: 'titulo', label: 'Tarea', type: 'text', width: 260 },
      { key: 'owner', label: 'Responsable', type: 'person', width: 170 },
      { key: 'due', label: 'Para cuándo', type: 'date', width: 140 },
      { key: 'estado', label: 'Estado', type: 'select', options: TASK_STATES, width: 120 },
      { key: 'prioridad', label: 'Prioridad', type: 'select', options: opts(['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']), width: 100 },
      { key: 'area', label: 'Área', type: 'select', options: AREAS, width: 130 },
    ],
  },
  team: {
    title: 'Equipo',
    singular: 'persona',
    columns: [
      { key: 'persona', label: 'Persona', type: 'text', width: 180 },
      { key: 'email', label: 'Usuario Pasito', type: 'person', width: 170 },
      { key: 'area', label: 'Área', type: 'select', options: AREAS, width: 130 },
      { key: 'rol', label: 'Rol', type: 'text', width: 180 },
      { key: 'ubicacion', label: 'Dónde está el día', type: 'text', width: 160 },
      { key: 'horario', label: 'Horario', type: 'text', width: 110 },
      { key: 'telefono', label: 'Teléfono', type: 'text', width: 140 },
    ],
  },
  learning: {
    title: 'Aprendizajes',
    singular: 'aprendizaje',
    columns: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: opts(['bien', 'Funcionó bien'], ['mejorar', 'A mejorar'], ['idea', 'Idea']), width: 140 },
      { key: 'texto', label: 'Aprendizaje', type: 'longtext', width: 420 },
    ],
  },
  checklist: {
    title: 'Checklist',
    singular: 'ítem',
    columns: [
      { key: 'hecho', label: '✓', type: 'bool', width: 50 },
      { key: 'item', label: 'Ítem', type: 'text', width: 320 },
      { key: 'fase', label: 'Fase', type: 'select', options: opts(['antes', 'Antes'], ['durante', 'Durante'], ['despues', 'Después']), width: 110 },
      { key: 'owner', label: 'Responsable', type: 'person', width: 170 },
    ],
  },
  kpi: {
    title: 'Objetivos',
    singular: 'objetivo',
    columns: [
      { key: 'nombre', label: 'Objetivo', type: 'text', width: 220 },
      { key: 'objetivo', label: 'Meta', type: 'number', width: 110 },
      { key: 'real', label: 'Real', type: 'number', width: 110 },
      { key: 'unidad', label: 'Unidad', type: 'text', width: 110 },
    ],
  },
  contact: {
    title: 'Contactos',
    singular: 'contacto',
    columns: [
      { key: 'nombre', label: 'Nombre', type: 'text', width: 180 },
      { key: 'rol', label: 'Rol / empresa', type: 'text', width: 180 },
      { key: 'telefono', label: 'Teléfono', type: 'text', width: 140 },
      { key: 'email', label: 'Email', type: 'text', width: 200 },
    ],
  },
  permit: {
    title: 'Permisos',
    singular: 'permiso',
    columns: [
      { key: 'tramite', label: 'Trámite', type: 'text', width: 220 },
      { key: 'organismo', label: 'Organismo', type: 'text', width: 160 },
      { key: 'estado', label: 'Estado', type: 'select', options: opts(['pendiente', 'Pendiente'], ['presentado', 'Presentado'], ['aprobado', 'Aprobado'], ['rechazado', 'Rechazado']), width: 130 },
      { key: 'vence', label: 'Fecha límite', type: 'date', width: 140 },
      { key: 'owner', label: 'Responsable', type: 'person', width: 170 },
    ],
  },
}

export const ROW_KINDS = Object.keys(SECTIONS) as RowKind[]

export function isRowKind(value: unknown): value is RowKind {
  return typeof value === 'string' && (ROW_KINDS as string[]).includes(value)
}

// Valida y normaliza un valor según la columna. Devuelve undefined si no es válido.
export function normalizeValue(column: Column, value: unknown): string | number | boolean | null | undefined {
  if (value === null || value === '' || value === undefined) return null
  switch (column.type) {
    case 'money':
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/\./g, '').replace(',', '.'))
      if (!Number.isFinite(n)) return undefined
      return column.type === 'money' ? Math.round(n) : n
    }
    case 'bool':
      return value === true || value === 'true'
    case 'date':
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
    case 'select':
      return typeof value === 'string' && column.options?.some((o) => o.value === value) ? value : undefined
    case 'url':
      return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) && value.length < 2000 ? value.trim() : undefined
    case 'person':
      return typeof value === 'string' && value.length < 200 ? value.trim().toLowerCase() : undefined
    default:
      return typeof value === 'string' && value.length <= 5000 ? value : undefined
  }
}

export type AttendeeKind = 'general' | 'invitado' | 'prensa' | 'sponsor' | 'staff'
export type AttendeeOrigin = 'app' | 'ticketera' | 'invitado' | 'staff' | 'puerta' | 'manual'

export const ATTENDEE_KINDS: { value: AttendeeKind; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'invitado', label: 'Invitado' },
  { value: 'prensa', label: 'Prensa' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'staff', label: 'Staff' },
]

export const ORIGIN_LABEL: Record<AttendeeOrigin, string> = {
  app: 'App Pasito',
  ticketera: 'Ticketera',
  invitado: 'Invitados',
  staff: 'Staff',
  puerta: 'Puerta',
  manual: 'Manual',
}

export type Attendee = {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  dni_last3: string | null
  kind: AttendeeKind
  origin: AttendeeOrigin
  origin_ref: string | null
  app_code: string | null
  companions: number
  companions_in: number
  notes: string | null
  qr_token: string
  status: 'anotado' | 'ingreso' | 'salio'
  checked_in_at: string | null
  checked_in_device: string | null
  created_at: string
}

export type ActivityEntry = {
  id: number
  event_id: string | null
  actor: string
  action: string
  entity: string
  summary: string
  created_at: string
}

export type TeamUser = { email: string; name: string | null; role: 'admin' | 'equipo' | 'lectura'; phone: string | null }

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `$${Math.round(value).toLocaleString('es-AR')}`
}

export function personLabel(email: string | null | undefined, users: TeamUser[]): string {
  if (!email) return ''
  const user = users.find((u) => u.email === email)
  return user?.name || email.split('@')[0]
}
