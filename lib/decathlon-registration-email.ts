export const DECATHLON_EVENT_EMAIL = {
  title: 'Todos a Decathlon',
  subtitle: 'Decathlon × Pasito',
  date: 'Domingo 9 de agosto',
  time: '9:30 a 14:00',
  place: 'Vicente López, Buenos Aires',
  capacity: 460,
  entryCost: 20,
} as const

export type DecathlonRegistrationEmail = {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

function firstName(displayName?: string | null): string | null {
  const value = displayName?.trim().split(/\s+/)[0]
  return value ? value.slice(0, 80) : null
}

export function renderDecathlonRegistrationEmail(params: {
  displayName?: string | null
  withdrawalUrl: string
  isTest?: boolean
}): DecathlonRegistrationEmail {
  const name = firstName(params.displayName)
  const greeting = name ? `¡Hola, ${escapeHtml(name)}!` : '¡Hola!'
  const textGreeting = name ? `¡Hola, ${name}!` : '¡Hola!'
  const safeWithdrawalUrl = escapeHtml(params.withdrawalUrl)
  const testBanner = params.isTest
    ? '<div style="margin:0 0 22px;padding:12px 15px;border-radius:12px;background:#fff3cd;color:#684f00;font-size:13px;font-weight:800;">PRUEBA INTERNA · Este botón no puede cancelar ninguna inscripción.</div>'
    : ''

  const html = `<!doctype html>
  <html lang="es">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f2f5ec;">
      <div style="max-width:580px;margin:0 auto;padding:36px 20px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#17382a;">
        <div style="padding:28px;text-align:center;border-radius:24px 24px 0 0;background:#0c6b45;">
          <img src="https://pasito.app/pasitohorizontal.png" width="118" alt="Pasito" style="display:inline-block;max-width:100%;filter:brightness(0) invert(1);">
        </div>
        <div style="padding:30px 26px 34px;border-radius:0 0 24px 24px;background:#fff;">
          ${testBanner}
          <p style="margin:0 0 9px;color:#0c6b45;font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.09em;">${DECATHLON_EVENT_EMAIL.subtitle}</p>
          <h1 style="margin:0 0 14px;font-size:29px;line-height:1.12;letter-spacing:-.025em;">¡Tu inscripción está confirmada!</h1>
          <p style="margin:0 0 18px;color:#52655b;font-size:16px;line-height:1.65;">${greeting} Ya tenés tu lugar en <strong>${DECATHLON_EVENT_EMAIL.title}</strong>.</p>

          <div style="margin:0 0 24px;padding:18px;border-radius:15px;background:#effa7a;color:#17382a;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:850;">${DECATHLON_EVENT_EMAIL.date} · ${DECATHLON_EVENT_EMAIL.time}</p>
            <p style="margin:0;font-size:14px;line-height:1.5;">Punto de encuentro: cartel corpóreo de Vicente López.</p>
          </div>

          <p style="margin:0 0 13px;color:#52655b;font-size:15px;line-height:1.65;">Llegá a las 9:30 para acreditarte desde la app, recibir tu pulsera y tu pasaporte. Después hacemos stretching y caminamos en grupo hasta Decathlon.</p>
          <p style="margin:0 0 24px;color:#52655b;font-size:15px;line-height:1.65;">Traé ropa cómoda y ganas de caminar, jugar y pasarla bien.</p>

          <div style="padding:20px;border:1px solid #dfe7dc;border-radius:16px;background:#fafcf7;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:850;">¿Al final no podés venir?</p>
            <p style="margin:0 0 17px;color:#52655b;font-size:14px;line-height:1.6;">Los ${DECATHLON_EVENT_EMAIL.capacity} cupos se completaron y mucha gente quedó afuera. Si sabés que no vas a poder asistir, podés liberar tu lugar para otra persona. Al confirmar la baja te devolvemos los ${DECATHLON_EVENT_EMAIL.entryCost} Pasitos.</p>
            <a href="${safeWithdrawalUrl}" style="box-sizing:border-box;display:block;width:100%;padding:14px 17px;border-radius:999px;background:#17382a;color:#fff;font-size:14px;font-weight:850;text-align:center;text-decoration:none;">No puedo asistir, quiero liberar mi cupo</a>
            <p style="margin:12px 0 0;color:#6a786f;font-size:12px;line-height:1.5;text-align:center;">Abrir el enlace no alcanza para darte de baja: te vamos a pedir una última confirmación.</p>
          </div>

          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e8ede6;color:#203d2e;font-size:14px;line-height:1.55;">Nos vemos el domingo,<br><strong>Equipo Pasito</strong></p>
        </div>
      </div>
    </body>
  </html>`

  const text = [
    params.isTest ? 'PRUEBA INTERNA: este enlace no puede cancelar ninguna inscripción.' : null,
    '¡Tu inscripción está confirmada!',
    `${textGreeting} Ya tenés tu lugar en ${DECATHLON_EVENT_EMAIL.title}.`,
    `${DECATHLON_EVENT_EMAIL.date}, de ${DECATHLON_EVENT_EMAIL.time}.`,
    'Punto de encuentro: cartel corpóreo de Vicente López.',
    'Llegá a las 9:30 para acreditarte desde la app, recibir tu pulsera y tu pasaporte.',
    `Los ${DECATHLON_EVENT_EMAIL.capacity} cupos se completaron y mucha gente quedó afuera. Si no podés asistir, liberá tu lugar desde este enlace. Al confirmar la baja te devolvemos los ${DECATHLON_EVENT_EMAIL.entryCost} Pasitos:`,
    params.withdrawalUrl,
    'Abrir el enlace no alcanza para darte de baja: te vamos a pedir una última confirmación.',
    'Nos vemos el domingo,\nEquipo Pasito',
  ].filter(Boolean).join('\n\n')

  return {
    subject: `${params.isTest ? '[PRUEBA] ' : ''}Inscripción confirmada · ${DECATHLON_EVENT_EMAIL.title}`,
    html,
    text,
  }
}
