import { buildPasitoLetter } from './email-layout.ts'
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

function firstName(displayName?: string | null): string | null {
  const value=displayName?.trim().split(/\s+/)[0];
  return value?value.slice(0,80):null;
}
export function renderDecathlonRegistrationEmail(params: {
  displayName?:string|null; withdrawalUrl:string; isTest?:boolean; isReminder?:boolean
}):DecathlonRegistrationEmail {
 const name=firstName(params.displayName);
 return buildPasitoLetter({
  subject:`${params.isTest?'[PRUEBA] ':''}${params.isReminder?'Recordatorio':'Inscripción confirmada'} · ${DECATHLON_EVENT_EMAIL.title}`,
  preview:'Los datos de tu inscripción y cómo liberar tu lugar si no podés venir.',campaign:'decathlon-inscripcion',
  paragraphs:[name?`Hola ${name} 👋`:'Hola 👋',
   ...(params.isTest?['PRUEBA INTERNA: este enlace no puede cancelar ninguna inscripción.']:[]),
   params.isReminder?'Tu lugar sigue confirmado':'Tu inscripción está confirmada',
   `${params.isReminder?'Te recuerdo que tenés':'Ya tenés'} tu lugar en ${DECATHLON_EVENT_EMAIL.title}.`,
   `${DECATHLON_EVENT_EMAIL.date}, de ${DECATHLON_EVENT_EMAIL.time}.`,
   'Punto de encuentro: cartel corpóreo de Vicente López.',
   'Llegá a las 9:30 para acreditarte desde la app, recibir tu pulsera y tu pasaporte. Después hacemos stretching y caminamos en grupo hasta Decathlon.',
   'Traé ropa cómoda y ganas de caminar, jugar y pasarla bien.',
   `Los ${DECATHLON_EVENT_EMAIL.capacity} cupos se completaron y mucha gente quedó afuera. Si no podés asistir, liberá tu lugar desde este enlace. Al confirmar la baja te devolvemos los ${DECATHLON_EVENT_EMAIL.entryCost} Pasitos.`,
   'Abrir el enlace no alcanza para darte de baja: te vamos a pedir una última confirmación.'],
  action:{label:'No puedo asistir, quiero liberar mi cupo',url:params.withdrawalUrl},preserveActionUrl:true,
  footer:'Te llega este mail por tu inscripción a Todos a Decathlon.'
 })
}
