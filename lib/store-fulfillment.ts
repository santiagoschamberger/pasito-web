export const PICKUP_LABEL = 'Retiro coordinado'
export const PICKUP_NOTE = 'Coordinamos el punto y horario después de la compra'
export const PICKUP_CONFIRMATION = 'Escribinos por WhatsApp para coordinar el punto, el día y el horario de retiro.'
export const PICKUP_WHATSAPP_NUMBER = '5491136491620'
export const PICKUP_WHATSAPP_NUMBER_DISPLAY = '+54 9 11 3649-1620'

function normalizedCustomerName(customerName?: string | null) {
  return customerName?.trim().replace(/\s+/g, ' ') || '[NOMBRE Y APELLIDO]'
}

export function pickupWhatsAppUrl(customerName?: string | null) {
  const message = [
    `Hola Pasito, soy ${normalizedCustomerName(customerName)}.`,
    'Voy a pasar a buscar mi remera el [DÍA] a las [HORA].',
  ].join(' ')

  return `https://wa.me/${PICKUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
