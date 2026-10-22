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
        <h1 style="color:#0B6B43;font-size:22px">Eventos Pasito</h1>
        <p>Tocá el botón para entrar. El link vence en 20 minutos y sirve una sola vez.</p>
        <p><a href="${escape(link)}" style="display:inline-block;background:#0B6B43;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Entrar</a></p>
        <p style="font-size:13px;color:#5F6761">Si no lo pediste, ignorá este mail.</p>
      </div>`,
  })
}

export async function sendTicketEmail(params: { to: string; name: string; eventName: string; when: string; venue: string; link: string }) {
  await send({
    to: params.to,
    subject: `Tu entrada para ${params.eventName}`,
    text: `Hola ${params.name}, esta es tu entrada para ${params.eventName} (${params.when}${params.venue ? `, ${params.venue}` : ''}).\n\nMostrá el QR en la puerta: ${params.link}\n\nUsamos tu nombre y contacto solo para el ingreso a este evento. Podés pedir que borremos tus datos respondiendo este mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171D1A">
        <h1 style="color:#0B6B43;font-size:22px">${escape(params.eventName)}</h1>
        <p>Hola ${escape(params.name)}, esta es tu entrada.</p>
        <p><strong>${escape(params.when)}</strong>${params.venue ? ` · ${escape(params.venue)}` : ''}</p>
        <p><a href="${escape(params.link)}" style="display:inline-block;background:#0B6B43;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Ver mi QR</a></p>
        <p>Mostralo en la puerta. Si no tenés batería, decí tu nombre: también te encontramos en la lista.</p>
        <p style="font-size:12px;color:#5F6761">Usamos tu nombre y contacto solo para el ingreso a este evento (Ley 25.326). Podés pedir que borremos tus datos respondiendo este mail.</p>
      </div>`,
  })
}
