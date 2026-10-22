'use client'

import { toast } from 'sonner'

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload: Record<string, unknown> = {}) {
    super(message)
  }
}

export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown; quiet?: boolean } = {}): Promise<T> {
  const response = await fetch(url, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (response.status === 401 && typeof window !== 'undefined' && !url.includes('/door/')) {
    window.location.href = `/gestion/login?next=${encodeURIComponent(window.location.pathname)}`
  }
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'Algo falló.'
    if (!init.quiet) toast.error(message)
    throw new ApiError(response.status, message, payload)
  }
  return payload as T
}
