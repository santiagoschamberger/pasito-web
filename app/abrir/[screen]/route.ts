import { emailLinkTargets } from '../../../lib/email-links.ts'

const escape = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export async function GET(request: Request, context: {params: Promise<{screen:string}>}) {
 const {screen}=await context.params
 const target=emailLinkTargets(screen,new URL(request.url).searchParams)
 if(!target)return new Response('Este enlace de Pasito no existe.',{status:404})
 const serialized=JSON.stringify(target).replace(/</g,'\\u003c')
 // A Universal/App Link opens before this handler runs. This fallback covers
 // mail tracking redirects, older installs and people without the application.
 const body=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Abrir Pasito</title></head>
 <body style="font-family:system-ui,sans-serif;margin:0;padding:48px 24px;color:#1F1F1A"><main style="max-width:420px;margin:auto"><h1>Abrí Pasito</h1><p>Si tenés la app, podés abrirla desde acá. Si todavía no la tenés, descargala para seguir.</p>
 <p><a id="open" href="${escape(target.custom)}" style="color:#006D42;font-weight:700">Abrir Pasito →</a></p>
 <p><a href="${escape(target.appStore)}">App Store</a> · <a href="${escape(target.playStore)}">Google Play</a></p></main>
 <script>const t=${serialized};const ua=navigator.userAgent;const ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);function open(){if(/Android/i.test(ua)){location.replace(t.android);return;}if(ios){const fallback=setTimeout(()=>{if(document.visibilityState==='visible')location.replace(t.appStore)},1800);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')clearTimeout(fallback)},{once:true});location.href=t.custom;}}document.getElementById('open').onclick=e=>{e.preventDefault();open()};if(/Android/i.test(ua)||ios)open();</script></body></html>`
 return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}})
}
