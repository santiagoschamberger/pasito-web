export const PICKUP_LABEL = 'Retiro en Belgrano o Palermo'
export const PICKUP_NOTE = 'Coordinamos el punto exacto y horario después de la compra'
export const PICKUP_CONFIRMATION = 'Escribinos por WhatsApp para elegir Belgrano o Palermo y coordinar el punto exacto, el día y el horario de retiro.'
export const PICKUP_WHATSAPP_NUMBER = '5491136491620'
export const PICKUP_WHATSAPP_NUMBER_DISPLAY = '+54 9 11 3649-1620'

function normalizedCustomerName(customerName?: string | null) {
  return customerName?.trim().replace(/\s+/g, ' ') || '[NOMBRE Y APELLIDO]'
}

export function pickupWhatsAppUrl(customerName?: string | null) {
  const message = [
    `Hola Pasito, soy ${normalizedCustomerName(customerName)}.`,
    'Voy a pasar por [BELGRANO O PALERMO] a buscar mi remera el [DÍA] a las [HORA].',
  ].join(' ')

  return `https://wa.me/${PICKUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
