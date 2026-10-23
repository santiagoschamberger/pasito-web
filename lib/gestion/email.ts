import { buildPasitoLetter } from '../email-layout.ts'
import 'server-only'

import { Resend } from 'resend'

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

async function send(params: { to: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Falta RESEND_API_KEY.')
  const { error } = await new Resend(apiKey).emails.send({ from: 'Eventos Pasito <noreply@pasito.app>', ...params })
  if (error) throw new Error(error.message)
}

export async function sendLoginEmail(email: string, link: string) {
  await send({ to: email, ...buildPasitoLetter({ subject: 'Tu acceso a Eventos Pasito', preview: 'Tu enlace privado para entrar a Eventos Pasito.', campaign: 'gestion-acceso',
    paragraphs: ['Hola 👋', 'Entrá a Eventos Pasito con este link. Vence en 20 minutos y sirve una sola vez.', 'Si no lo pediste, ignorá este mail.'],
    action: { label: 'Entrar a Eventos Pasito', url: link }, preserveActionUrl: true, footer: 'Te llega este mail porque pediste acceso a Eventos Pasito.' }) })
}

type TicketMail = { to: string; name: string; eventName: string; when: string; venue: string; link: string }
function ticketMessage(params: TicketMail) {
  return { from: 'Eventos Pasito <noreply@pasito.app>', to: params.to,
    ...buildPasitoLetter({ subject: `Tu entrada para ${params.eventName}`, preview: 'Tu entrada y cómo mostrarla al ingresar.', campaign: 'gestion-entrada',
      paragraphs: [params.name.trim() ? `Hola ${params.name.trim()} 👋` : 'Hola 👋', `Esta es tu entrada para ${params.eventName}.`, `${params.when}${params.venue ? ` · ${params.venue}` : ''}`,
        'Mostrá el QR en la puerta. Si no tenés batería, decí tu nombre: también te encontramos en la lista.',
        'Usamos tu nombre y contacto solo para el ingreso a este evento (Ley 25.326). Podés pedir que borremos tus datos respondiendo este mail.'],
      action: { label: 'Ver mi QR', url: params.link }, preserveActionUrl: true, footer: 'Te llega este mail por tu inscripción al evento.' }) }
}

// Envío en lotes de 100 (API batch de Resend) para no chocar con el límite por segundo.
export async function sendTicketEmails(mails: TicketMail[]): Promise<{ sent: string[]; failed: string[] }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Falta RESEND_API_KEY.')
  const resend = new Resend(apiKey)
  const sent: string[] = []
  const failed: string[] = []
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100)
    const { error } = await resend.batch.send(chunk.map(ticketMessage))
    if (error) {
      console.error('[gestion] batch email', error)
      failed.push(...chunk.map((m) => m.to))
    } else sent.push(...chunk.map((m) => m.to))
    if (i + 100 < mails.length) await new Promise((r) => setTimeout(r, 600))
  }
  return { sent, failed }
}

type DigestItem = { text: string; meta: string; href: string; tone?: 'bad' | 'warn' }

export async function sendDigestEmail(params: { to: string; name: string; tasks: DigestItem[]; alerts: DigestItem[]; events: DigestItem[]; baseUrl: string }) {
  await send({ to: params.to, ...buildPasitoLetter({ subject: 'Tu día en Eventos Pasito', preview: 'Tus tareas, alertas y próximos eventos.', campaign: 'gestion-resumen',
    paragraphs: [params.name.trim() ? `Hola ${params.name.trim()} 👋` : 'Hola 👋', 'Esto es lo tuyo para hoy en Eventos Pasito.',
      ...params.tasks.map(i => `Tarea: ${i.text} (${i.meta}). ${i.href}`),
      ...params.alerts.map(i => `Alerta: ${i.text} (${i.meta}). ${i.href}`),
      ...params.events.map(i => `Evento: ${i.text} (${i.meta}). ${i.href}`)],
    action: { label: 'Abrir Eventos Pasito', url: params.baseUrl }, footer: 'Te llega porque sos parte del equipo en eventos.pasito.app.' }) })
}
