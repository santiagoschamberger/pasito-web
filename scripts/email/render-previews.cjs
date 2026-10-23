// Offline renderer: the Resend implementation is replaced before any sender is loaded.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),ts=require('typescript'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),cache=new Map(),captured=[];
const env={RESEND_API_KEY:'offline-preview-only',EVENT_TICKET_SIGNING_SECRET:'preview-signing-secret-not-used-by-production'};
function load(relative){
 const filename=path.resolve(root,relative);if(cache.has(filename))return cache.get(filename);
 const module={exports:{}};cache.set(filename,module.exports);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,Buffer,TextEncoder,URL,URLSearchParams,Date,process:{env},setTimeout,console,
  require(name){
   if(name==='server-only')return {};
   if(name==='resend')return {Resend:class {
     emails={send:async(email)=>{captured.push(email);return {data:{id:'offline-preview'},error:null}}};
     batch={send:async(emails)=>{captured.push(...emails);return {data:[],error:null}}};
   }};
   if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
   if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(filename),name.endsWith('.ts')?name:name+'.ts')));
   return require(name);
  },
 },{filename});return module.exports;
}
async function main(){
 const lock=JSON.parse(fs.readFileSync(path.join(root,'scripts/email/design-lock.json')));
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'lib/email-layout.ts'))).digest('hex')!==lock.sha256)throw Error('Email design differs from reviewed lock');
 const outIndex=process.argv.indexOf('--out'),out=outIndex<0?fs.mkdtempSync(path.join(os.tmpdir(),'pasito-web-mails-')):process.argv[outIndex+1];fs.mkdirSync(out,{recursive:true});
 const manifest=[];
 function add(name,email,flags){
  fs.writeFileSync(path.join(out,name+'.html'),email.html);fs.writeFileSync(path.join(out,name+'.txt'),email.text);
  const r=spawnSync('python3',[path.join(root,'scripts/email/lint_mail.py'),path.join(out,name+'.html'),'--asunto',email.subject,'--texto',path.join(out,name+'.txt'),...flags],{encoding:'utf8'});
  if(r.status!==0)throw Error(name+': '+r.stdout+r.stderr);manifest.push({name,subject:email.subject,flags});
 }
 const t=load('lib/web-email-templates.ts');
 add('compra-remera',t.orderConfirmationEmail({variant:'Remera verde',size:'M',qty:1,amount:42000,shippingAddress:{line1:'Av. de ejemplo 123',line2:'',city:'Buenos Aires',province:'CABA',postalCode:'1000',phone:'Dato de ejemplo',notes:''}}),['--sin-accion']);
 add('retiro-remera',t.pickupInstructionsEmail({customerName:'Santi',variant:'Remera verde',size:'M',qty:1,pickupLocation:'palermo'}),['--link-privado','--enlace-externo']);
 add('lista-espera',t.waitlistConfirmationEmail('qa@example.invalid'),['--sin-accion']);
 add('club-lista-espera',t.clubWaitlistEmail(true),['--sin-accion']);
 add('contacto-interno',t.contactNotificationEmail('Santi','qa@example.invalid','Mensaje de ejemplo.'),['--sin-accion']);
 add('embajador-interno',t.ambassadorNotificationEmail({fullName:'Santi',instagram:'pasito',location:'Buenos Aires',email:'qa@example.invalid',whatsapp:'Dato de ejemplo',pasitoReason:'Caminar'}),['--sin-accion']);
 add('decathlon-inscripcion',load('lib/decathlon-registration-email.ts').renderDecathlonRegistrationEmail({displayName:'Santi',withdrawalUrl:'https://www.pasito.app/eventos/decathlon/baja?token=example-never-valid'}),['--link-privado']);
 async function send(name,fn,flags){const before=captured.length;await fn();if(captured.length!==before+1)throw Error('Unexpected offline mail count');add(name,captured.at(-1),flags);}
 const ticket={id:'00000000-0000-4000-8000-000000000001',code:'EXAMPLE-123',number:1,position:1,label:'Fecha de ejemplo',status:'valid'};
 const order={id:'preview-order',paymentId:'preview-payment',customerName:'Santi',customerEmail:'qa@example.invalid',email:'qa@example.invalid',amount:35000,quantity:1,tickets:[ticket]};
 for(const [file,method,name] of [['silver-ticket-email','sendSilverTicketsEmail','silver-entrada'],['tomate-ticket-email','sendTomateTicketsEmail','tomate-entrada']])await send(name,()=>load('lib/'+file+'.ts')[method]({origin:'https://www.pasito.app',orders:[order],kind:'confirmation'}),['--link-privado']);
 await send('club-entrada',()=>load('lib/pasito-club-ticket-email.ts').sendPasitoClubTicketsEmail({origin:'https://www.pasito.app',bundle:{order,tickets:[ticket]}}),['--link-privado']);
 await send('uruguay-entrada',()=>load('lib/uruguay-ticket-email.ts').sendWalkingClubUyTicketsEmail({origin:'https://www.pasito.app',order:{id:'preview',customer_email:'qa@example.invalid',amount:100},tickets:[{id:ticket.id,short_code:ticket.code,ticket_number:1}]}),['--sin-accion']);
 await send('codigo-verificacion',()=>load('lib/pasito50-email.ts').sendPasito50VerificationEmail({email:'qa@example.invalid',code:'123456'}),['--sin-accion']);
 const gestion=load('lib/gestion/email.ts');
 await send('gestion-acceso',()=>gestion.sendLoginEmail('qa@example.invalid','https://eventos.pasito.app/gestion/login?token=example-never-valid'),['--link-privado']);
 await send('gestion-entrada',()=>gestion.sendTicketEmails([{to:'qa@example.invalid',name:'Santi',eventName:'Evento de ejemplo',when:'Fecha del evento',venue:'Buenos Aires',link:'https://eventos.pasito.app/gestion/ticket/example'}]),['--link-privado']);
 await send('gestion-resumen',()=>gestion.sendDigestEmail({to:'qa@example.invalid',name:'Santi',tasks:[],alerts:[],events:[],baseUrl:'https://eventos.pasito.app/gestion'}),[]);
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(`${manifest.length} web email formats verified offline; no delivery.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
