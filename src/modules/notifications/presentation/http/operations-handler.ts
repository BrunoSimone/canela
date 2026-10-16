import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";
import { FulfillmentError } from "@/modules/shipping/domain/fulfillment";
import type { DispatchSummary } from "@/modules/shipping/domain/fulfillment";
import type { NoticeSummary } from "../../domain/notification";
type Deps={session:()=>Promise<{email:string}|null>;enabled:()=>boolean;mailEnabled:()=>boolean;dispatch:(id:string,remoteId:number,actor:string)=>Promise<DispatchSummary>;process:(id:string)=>Promise<unknown>;summary:(id:string)=>Promise<NoticeSummary[]>};
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
export function operationsHandlers(deps:Deps){
 async function run(action:"dispatch"|"retry",request:Request,id:string){
  const session=await deps.session();if(!session)return json({code:"UNAUTHORIZED"},401);
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))return json({code:"ORDER_NOT_FOUND"},404);
  if(!isSameOriginAdminRequest(request)||new URL(request.url).searchParams.get("demo")==="1")return json({code:"INVALID_ORIGIN"},403);
  if(!request.headers.get("Content-Type")?.startsWith("application/json"))return json({code:"INVALID_OPERATION"},422);
  try{
    const chunks:Uint8Array[]=[];let size=0;const reader=request.body?.getReader();if(!reader)throw new SyntaxError();
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw new SyntaxError();}chunks.push(value);}
    const body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if(!body||typeof body!=="object"||Array.isArray(body))throw new SyntaxError();
    if(action==="dispatch"){
      if(body.confirmHandedOver!==true||!Number.isSafeInteger(body.expectedRemoteId)||body.expectedRemoteId<1)throw new SyntaxError();
      if(!deps.enabled())return json({code:"SHIPMENT_DISABLED"},503);
      return json(await deps.dispatch(id,body.expectedRemoteId,session.email));
    }
    if(body.action!=="retry")throw new SyntaxError();
    if(!deps.mailEnabled())return json({code:"MAIL_DISABLED"},503);
    await deps.process(id);return json(await deps.summary(id));
  }catch(error){
    if(error instanceof SyntaxError)return json({code:"INVALID_OPERATION"},422);
    if(error instanceof FulfillmentError)return json({code:error.code},error.status);
    console.error(JSON.stringify({event:"order_operation_failed",action}));return json({code:"OPERATION_UNAVAILABLE"},503);
  }
 }
 return {dispatch:(request:Request,id:string)=>run("dispatch",request,id),retry:(request:Request,id:string)=>run("retry",request,id)};
}
