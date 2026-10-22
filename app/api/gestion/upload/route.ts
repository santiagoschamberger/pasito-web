import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, HttpError, requireUser } from '@/lib/gestion/server'

const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

// Logos de sponsors y portadas de eventos. Bucket público: solo imágenes, 3 MB.
export async function POST(request: NextRequest) {
  try {
    await requireUser({ edit: true })
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) throw new HttpError(400, 'Elegí una imagen.')
    const ext = TYPES[file.type]
    if (!ext) throw new HttpError(400, 'Formato no soportado: usá PNG, JPG, WebP, SVG o GIF.')
    if (file.size > 3 * 1024 * 1024) throw new HttpError(400, 'La imagen pesa más de 3 MB.')
    const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`
    const { error } = await db().storage.from('gestion-public').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000' })
    if (error) throw error
    const { data } = db().storage.from('gestion-public').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    return handleError(error)
  }
}
