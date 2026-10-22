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
  await send({
    to: email,
    subject: 'Tu acceso a Eventos Pasito',
    text: `Entrá a Eventos Pasito con este link (vence en 20 minutos y sirve una sola vez):\n\n${link}\n\nSi no lo pediste, ignorá este mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171D1A">
        <p style="margin:0 0 16px"><img src="https://www.pasito.app/logoverde.png" alt="Pasito" height="22" style="height:22px"></p>
        <h1 style="color:#006D42;font-size:22px">Eventos Pasito</h1>
        <p>Tocá el botón para entrar. El link vence en 20 minutos y sirve una sola vez.</p>
        <p><a href="${escape(link)}" style="display:inline-block;background:#006D42;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Entrar</a></p>
        <p style="font-size:13px;color:#5F6761">Si no lo pediste, ignorá este mail.</p>
      </div>`,
  })
}

type TicketMail = { to: string; name: string; eventName: string; when: string; venue: string; link: string }

function ticketMessage(params: TicketMail) {
  return {
    from: 'Eventos Pasito <noreply@pasito.app>',
    to: params.to,
    subject: `Tu entrada para ${params.eventName}`,
    text: `Hola ${params.name}, esta es tu entrada para ${params.eventName} (${params.when}${params.venue ? `, ${params.venue}` : ''}).\n\nMostrá el QR en la puerta: ${params.link}\n\nUsamos tu nombre y contacto solo para el ingreso a este evento. Podés pedir que borremos tus datos respondiendo este mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171D1A">
        <p style="margin:0 0 16px"><img src="https://www.pasito.app/logoverde.png" alt="Pasito" height="22" style="height:22px"></p>
        <h1 style="color:#006D42;font-size:22px">${escape(params.eventName)}</h1>
        <p>Hola ${escape(params.name)}, esta es tu entrada.</p>
        <p><strong>${escape(params.when)}</strong>${params.venue ? ` · ${escape(params.venue)}` : ''}</p>
        <p><a href="${escape(params.link)}" style="display:inline-block;background:#006D42;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Ver mi QR</a></p>
        <p>Mostralo en la puerta. Si no tenés batería, decí tu nombre: también te encontramos en la lista.</p>
        <p style="font-size:12px;color:#5F6761">Usamos tu nombre y contacto solo para el ingreso a este evento (Ley 25.326). Podés pedir que borremos tus datos respondiendo este mail.</p>
      </div>`,
  }
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
  const section = (title: string, items: DigestItem[]) =>
    items.length
      ? `<h2 style="font-size:16px;margin:24px 0 8px">${escape(title)}</h2>
         <table style="width:100%;border-collapse:collapse">${items
           .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EDF1EB"><a href="${escape(i.href)}" style="color:${i.tone === 'bad' ? '#B14D3B' : '#171D1A'};text-decoration:none;font-weight:600">${escape(i.text)}</a><br><span style="color:#5F6761;font-size:13px">${escape(i.meta)}</span></td></tr>`)
           .join('')}</table>`
      : ''
  const text = [
    `Hola ${params.name}, esto es lo tuyo para hoy en Eventos Pasito.`,
    ...params.tasks.map((t) => `· ${t.text} (${t.meta})`),
    ...params.alerts.map((a) => `! ${a.text} (${a.meta})`),
    ...params.events.map((e) => `> ${e.text} (${e.meta})`),
    params.baseUrl,
  ].join('\n')
  await send({
    to: params.to,
    subject: `Tu día en Eventos Pasito: ${params.tasks.length} tarea(s), ${params.alerts.length} alerta(s)`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171D1A">
        <p style="margin:0 0 16px"><img src="https://www.pasito.app/logoverde.png" alt="Pasito" height="22" style="height:22px"></p>
        <h1 style="font-size:22px;margin:0">Buen día, ${escape(params.name)}</h1>
        <p style="color:#5F6761;margin:4px 0 0">Esto es lo tuyo para hoy.</p>
        ${section('Tus tareas', params.tasks)}
        ${section('Qué está en riesgo en tus eventos', params.alerts)}
        ${section('Esta semana', params.events)}
        <p style="margin-top:24px"><a href="${escape(params.baseUrl)}" style="display:inline-block;background:#006D42;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Abrir Eventos Pasito</a></p>
        <p style="font-size:12px;color:#9AA39D">Te llega porque sos parte del equipo en eventos.pasito.app.</p>
      </div>`,
  })
}
