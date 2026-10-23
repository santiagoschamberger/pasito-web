import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emailLinkTargets } from '../lib/email-links.ts'
import { GET } from '../app/abrir/[screen]/route.ts'
for(const screen of ['inicio','premios','reservas','entradas'])test(`email destination ${screen}`,async()=>{
 const target=emailLinkTargets(screen,new URLSearchParams('utm_source=email&utm_campaign=prueba&utm_content=principal&token=secret'))!
 assert.ok(target.canonical.includes(`abrir/${screen}?utm_source=email`));assert.ok(!target.canonical.includes('secret'))
 assert.ok(target.android.includes('package=ar.pasito.pasito'));assert.ok(target.custom.startsWith('ar.pasito.pasito://abrir/'))
 const response=await GET(new Request(target.canonical),{params:Promise.resolve({screen})})
 assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('App Store'));assert.ok(html.includes('Google Play'));assert.ok(html.includes('id6760863724'));assert.ok(!html.includes('secret'))
})
test('unknown screens cannot redirect externally',async()=>{
 assert.equal(emailLinkTargets('https://evil.example',new URLSearchParams()),null)
 assert.equal((await GET(new Request('https://pasito.app/abrir/admin'),{params:Promise.resolve({screen:'admin'})})).status,404)
})
test('iOS association keeps existing routes and includes email routes',()=>{
 const j=JSON.parse(readFileSync(new URL('../public/.well-known/apple-app-site-association',import.meta.url),'utf8'))
 const routes=j.applinks.details.flatMap((d:any)=>d.components.map((c:any)=>c['/']))
 for(const route of ['/abrir/*','/events/*','/g/*','/i/*','/challenges/*'])assert.ok(routes.includes(route))
})

test('iPhone opening never guesses that the app failed and launches the store',async()=>{
 const {runInNewContext}=await import('node:vm')
 const response=await GET(new Request('https://pasito.app/abrir/inicio'),{params:Promise.resolve({screen:'inicio'})})
 const html=await response.text();const script=html.match(/<script>([\s\S]*?)<\/script>/)![1]
 const location={href:'',replace(_url:string){assert.fail('iOS must not redirect to a store')}}
 const button:{onclick?:Function}={}
 runInNewContext(script,{navigator:{userAgent:'iPhone',maxTouchPoints:5},location,document:{getElementById:()=>button},setTimeout:()=>assert.fail('No store fallback timer is allowed')})
 assert.ok(location.href.startsWith('ar.pasito.pasito://abrir/inicio'))
 button.onclick!({preventDefault(){}})
 assert.ok(location.href.startsWith('ar.pasito.pasito://abrir/inicio'))
 assert.ok(html.includes('/brand/logo-green.svg'))
})
