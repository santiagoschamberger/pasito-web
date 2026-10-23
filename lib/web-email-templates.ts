import { buildPasitoLetter, emailValue } from './email-layout.ts'
import { formatShippingAddress, type ShippingAddress } from './store-shipping.ts'
import { pickupLabel, pickupWhatsAppUrl, PICKUP_WHATSAPP_NUMBER_DISPLAY, type PickupLocation } from './store-fulfillment.ts'
export function orderConfirmationEmail(params: { name?: string; customerName?: string|null; variant:string; size:string; qty:number; amount:number; shippingAddress:ShippingAddress }) {
 return buildPasitoLetter({ subject:'Confirmamos tu Remera Pasito', preview:'Los datos de tu compra y el envío a domicilio.',campaign:'compra-remera',
  paragraphs:['Hola 👋','Confirmamos tu pedido de la Remera Pasito. Gracias por ser parte.',
   `${params.variant} · Talle ${params.size} · ${params.qty} unidad(es).`, 'Entrega: Envío a domicilio',
   `Dirección: ${formatShippingAddress(params.shippingAddress)}`, `Teléfono: ${params.shippingAddress.phone}`,
   ...(params.shippingAddress.notes ? [`Indicaciones: ${params.shippingAddress.notes}`] : []),
   `Total: ${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(params.amount)}`,
   'Tu dirección quedó guardada. Si necesitás consultar por el despacho, respondé este mail.'],footer:'Te llega este mail por tu compra en la tienda de Pasito.' })
}
export function pickupInstructionsEmail(params:{customerName?:string|null;variant:string;size:string;qty:number;pickupLocation?:PickupLocation|null}) {
 return buildPasitoLetter({subject:'Coordinemos el retiro de tu remera',preview:'Los datos para coordinar tu retiro por WhatsApp.',campaign:'retiro-remera',
  paragraphs:['Hola 👋',`Tu pedido está registrado para ${pickupLabel(params.pickupLocation).toLowerCase()}.`,`${params.variant} · Talle ${params.size} · ${params.qty} unidad(es).`,
   `Enviá un mensaje al ${PICKUP_WHATSAPP_NUMBER_DISPLAY} indicando tu nombre y apellido, qué día y a qué hora vas a pasar a buscarla. Completá [DÍA] y [HORA] antes de enviarlo.`],
  action:{label:'Coordinar por WhatsApp',url:pickupWhatsAppUrl(params.customerName,params.pickupLocation)},preserveActionUrl:true,
  footer:'Te llega este mail por el retiro de tu compra en Pasito.'})
}
export function waitlistConfirmationEmail(email:string) {
 return buildPasitoLetter({subject:'Ya estás en la lista de Pasito',preview:'Registramos tu interés en Pasito.',campaign:'lista-espera',
  paragraphs:['Hola 👋',`Anotamos ${email} en la lista de Pasito. Gracias por querer ser parte.`, 'Si no pediste anotarte, respondé este mail y te ayudo.'],footer:'Te llega este mail porque te anotaste en la lista de Pasito.'})
}
export function clubWaitlistEmail(notifyTickets:boolean) {
 return buildPasitoLetter({subject:'Estás en la lista de Pasito Club',preview:'Registramos tu interés en Pasito Club.',campaign:'club-lista-espera',
  paragraphs:['Hola 👋','Ya estás en la lista de Pasito Club. No hace falta ser runner: podés empezar caminando.',...(notifyTickets?['También registramos que querés recibir novedades de las entradas.']:[])],footer:'Te llega este mail porque te anotaste en la lista de Pasito Club.'})
}
export function contactNotificationEmail(name:string,email:string,message:string) {
 return buildPasitoLetter({subject:'Nuevo mensaje de contacto',preview:'Llegó un mensaje desde el formulario de la web.',campaign:'contacto-interno',
  paragraphs:['Hola 👋',`Nombre: ${emailValue(name,'Sin nombre')}`,`Email: ${email}`,message],footer:'Aviso interno del formulario de contacto de Pasito.'})
}
export function ambassadorNotificationEmail(lead:Record<string,string>) {
 return buildPasitoLetter({subject:'Nuevo interesado en Embajadores Pasito',preview:'Una persona completó el formulario de embajadores.',campaign:'embajadores-interno',
  paragraphs:['Hola 👋','Llegó una nueva solicitud para Embajadores Pasito.'],details:[['Nombre y apellido',lead.fullName],['Instagram',lead.instagram],['Dónde quiere representar a Pasito',lead.location],['Email',lead.email],['WhatsApp',lead.whatsapp],['Por qué le gusta Pasito',lead.pasitoReason]].map(([label,value])=>({label,value:emailValue(value,'Sin completar')})),footer:'Aviso interno del formulario de Embajadores Pasito.'})
}
