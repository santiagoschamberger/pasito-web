import { buildPasitoLetter } from './email-layout.ts'
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
    ...buildPasitoLetter({ subject: 'Tu código de verificación de Pasito', preview: 'El código que pediste para verificar tu cuenta.', campaign: 'pasito50-verificacion',
      paragraphs: ['Hola 👋', 'Tu código de verificación es:', params.code, 'Vence en 10 minutos y puede usarse una sola vez.', 'Si no solicitaste este código, ignorá este email.'],
      footer: 'Te llega este mail porque pediste verificar tu cuenta en Pasito.' }),
  })
  if (error) throw error
}
