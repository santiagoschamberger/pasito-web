import 'server-only'
import type { RebillAccount } from './rebill-routing'
import type { RebillPayment } from './tomate-rebill'

// A bounded replay through the existing authenticated webhook path. No new
// credentials, endpoint permissions, subscription creation or provider writes.
export async function recoverRebillPayments(account: RebillAccount, offset: number, deliver: (paymentId: string) => Promise<Response>, search?: (offset: number) => Promise<{records?: RebillPayment[];pagination?: {hasNextPage?: boolean;has_next_page?: boolean}}>) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 100_000) throw new Error('Cursor de recuperación inválido.')
  const key = process.env[account === 'SIN_IVA' ? 'REBILL_NO_IVA_SECRET_KEY' : account === 'CON_IVA' ? 'REBILL_SECRET_KEY' : 'SILVER_REBILL_SECRET_KEY']?.trim()
  if (!search && !key) throw new Error('Falta configurar la cuenta de recuperación.')
  const fetchPage=search ?? (async (offset: number) => {
    const response=await fetch('https://api.rebill.com/v3/payments/search',{method:'POST',headers:{'x-api-key':key!,'content-type':'application/json'},body:JSON.stringify({filters:{},search:'',pagination:{limit:20,offset,sort:'created_at',order:'DESC'}}),cache:'no-store',signal:AbortSignal.timeout(8000)})
    if (!response.ok) throw new Error(`Rebill respondió ${response.status}.`)
    return response.json() as Promise<{records?: RebillPayment[];pagination?: {hasNextPage?: boolean;has_next_page?: boolean}}>
  })
  let processed=0
  for(let page=0;page<2;page++) {
    const currentOffset=offset+page*20
    const response=await fetchPage(currentOffset)
    if(!Array.isArray(response.records) || response.records.length > 20) throw new Error('Respuesta de recuperación inválida.')
    const records=response.records
    for(let i=0;i<records.length;i+=5) {
      await Promise.all(records.slice(i,i+5).map(async payment=>{
        if(!payment.id || payment.subscriptionId || payment.subscription_id) return
        const result=await deliver(payment.id)
        if(!result.ok && result.status!==204) throw new Error('La recuperación requiere reintento o revisión.')
        processed++
      }))
    }
    const hasNext=response.pagination?.hasNextPage ?? response.pagination?.has_next_page ?? records.length===20
    if(!hasNext || records.length===0) return {processed,nextOffset:null}
  }
  return {processed,nextOffset:offset+40}
}
