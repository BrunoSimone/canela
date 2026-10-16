import { MailDeliveryError, type OutboundEmail } from "../domain/notification";
export async function sendResendEmail(apiKey:string,payload:OutboundEmail,key:string,fetcher:typeof fetch=fetch):Promise<string>{
  const response=await fetcher("https://api.resend.com/emails",{method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000),
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`,"Idempotency-Key":key},body:JSON.stringify(payload)});
  if(!response.ok){
    const retry=response.status>=500||[408,409,429].includes(response.status);
    throw new MailDeliveryError(!retry,retry?"MAIL_RETRY":"MAIL_REJECTED");
  }
  const data:unknown=await response.json();
  if(!data||typeof data!=="object"||!("id" in data)||typeof data.id!=="string"||!data.id)throw new MailDeliveryError(false,"MAIL_RESPONSE_UNCERTAIN");
  return data.id;
}
