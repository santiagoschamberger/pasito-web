import 'server-only'

import { Resend } from 'resend'

export async function sendPasito50VerificationEmail(params: {
  email: string
  code: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Falta RESEND_API_KEY.')

  const { error } = await new Resend(apiKey).emails.send({
    from: 'Pasito <noreply@pasito.app>',
    to: params.email,
    subject: `${params.code} es tu código para recibir 50 Pasitos`,
    text: [
      `Tu código de verificación es ${params.code}.`,
      'Vence en 10 minutos y puede usarse una sola vez.',
      'Si no solicitaste este código, ignorá este email.',
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#173f31">
        <h1 style="color:#0c6b45">Verificá tu cuenta de Pasito</h1>
        <p>Ingresá este código para recibir tus 50 Pasitos:</p>
        <p style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0c6b45">${params.code}</p>
        <p>Vence en 10 minutos y puede usarse una sola vez.</p>
        <p style="font-size:13px;color:#6c8278">Si no solicitaste este código, ignorá este email.</p>
      </div>
    `,
  })
  if (error) throw error
}
