import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDecathlonRegistrationEmail } from '../lib/decathlon-registration-email.ts'
import { orderConfirmationEmail, waitlistConfirmationEmail, contactNotificationEmail, clubWaitlistEmail, ambassadorNotificationEmail, pickupInstructionsEmail } from '../lib/web-email-templates.ts'
import { buildAuthParams } from '../app/auth-confirm/auth-confirm.ts'
const letters=[
 renderDecathlonRegistrationEmail({displayName:'<María>',withdrawalUrl:'https://www.pasito.app/eventos/decathlon/baja?token=fake&x=1'}),
 waitlistConfirmationEmail('qa@example.invalid'),clubWaitlistEmail(true),contactNotificationEmail('<Santi>','qa@example.invalid','<script>alert(1)</script>'),
 ambassadorNotificationEmail({fullName:'<Santi>',instagram:'pasito',location:'Buenos Aires',email:'qa@example.invalid',whatsapp:'Sin especificar',pasitoReason:'Caminar'}),
 pickupInstructionsEmail({customerName:'Santi',variant:'Verde',size:'M',qty:1,pickupLocation:'palermo'}),
 orderConfirmationEmail({variant:'Verde',size:'M',qty:1,amount:42000,shippingAddress:{line1:'Av. de prueba 123',line2:'',city:'Buenos Aires',province:'CABA',postalCode:'1000',phone:'123',notes:''}}),
]
for(const [i,email] of letters.entries())test(`web email ${i} follows shared design`,()=>{
 assert.equal((email.html.match(/<img\b/g)??[]).length,1)
 assert.match(email.html,/bgcolor="#006D42"/);assert.match(email.html,/width="560"/)
 assert.match(email.text,/Caminando pasan cosas lindas,\nSanti\nPasito/)
 assert.match(email.text,/Buenos Aires, Argentina/)
 assert.ok(Array.from(email.subject).length<=50)
 assert.doesNotMatch(email.html,/<script>|<button|border-radius:999px/)
})
test('access wrapper receives hash and callback as separate, valid parameters',()=>{
 const url=new URL('https://www.pasito.app/auth-confirm?token_hash=example-hash&type=magiclink&redirect_to=ar.pasito.pasito%3A%2F%2Flogin-callback')
 assert.deepEqual(buildAuthParams(Object.fromEntries(url.searchParams)),{token:'example-hash',type:'magiclink',redirectTo:'ar.pasito.pasito://login-callback'})
})
