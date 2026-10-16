import { InvalidShippingQuoteError, ExpiredShippingQuoteError } from "../../domain/shipping-quote";
import { isSameOriginAdminRequest } from "../../../admin/infrastructure/admin-origin";
import { FulfillmentError, shipmentSummary } from "../../domain/fulfillment";
import type { FulfillOrder } from "../../application/fulfill-order";

type Dependencies={session:()=>Promise<{email:string}|null>;service:()=>FulfillOrder;readLabel:(id:string)=>Promise<Uint8Array|null>};
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex","X-Content-Type-Options":"nosniff"};
function json(body:unknown,status=200){return Response.json(body,{status,headers});}
function validId(id:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);}
export function createFulfillmentHandlers(deps:Dependencies){
  return {
    async post(request:Request,id:string):Promise<Response>{
      const session=await deps.session();if(!session)return json({code:"UNAUTHORIZED"},401);
      if(!validId(id))return json({code:"ORDER_NOT_FOUND"},404);
      if(!isSameOriginAdminRequest(request))return json({code:"INVALID_ORIGIN"},403);
      if(new URL(request.url).searchParams.get("demo")==="1")return json({code:"SHIPMENT_DEMO_READONLY"},403);
      if(!request.headers.get("Content-Type")?.startsWith("application/json"))return json({code:"INVALID_SHIPMENT_REQUEST"},422);
      try{
        const reader=request.body?.getReader();if(!reader)throw new SyntaxError();let size=0;const chunks:Uint8Array[]=[];
        for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>40000){await reader.cancel();throw new SyntaxError();}chunks.push(value);}
        const input:unknown=JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if(!input||typeof input!=="object"||Array.isArray(input))throw new SyntaxError();
        if(Object.keys(input).some(key=>!["action","expectedPreparationVersion","approvedQuoteToken"].includes(key)))throw new SyntaxError();
        const {action,expectedPreparationVersion,approvedQuoteToken}=input as Record<string,unknown>;
        if(action!=="confirm"&&action!=="refresh"&&action!=="preview")throw new SyntaxError();
        if((action==="confirm"||action==="preview")&&(!Number.isSafeInteger(expectedPreparationVersion)||(expectedPreparationVersion as number)<1))throw new SyntaxError();
        if(approvedQuoteToken!==undefined&&(typeof approvedQuoteToken!=="string"||approvedQuoteToken.length>32768))throw new SyntaxError();
        const service=deps.service();
        if(action==="preview")return json(await service.preview(id,expectedPreparationVersion as number));
        const record=action==="confirm"?await service.confirm(id,expectedPreparationVersion as number,session.email,...(typeof approvedQuoteToken==="string"?[approvedQuoteToken]:[])):await service.recover(id);
        return json(shipmentSummary(record));
      }catch(error){
        if(error instanceof InvalidShippingQuoteError||error instanceof ExpiredShippingQuoteError)return json({code:"SHIPMENT_APPROVAL_EXPIRED"},409);
        if(error instanceof SyntaxError)return json({code:"INVALID_SHIPMENT_REQUEST"},422);
        if(error instanceof FulfillmentError)return json({code:error.code},error.status);
        console.error(JSON.stringify({event:"shipment_operation_failed"}));
        return json({code:"SHIPMENT_UNAVAILABLE"},503);
      }
    },
    async label(id:string):Promise<Response>{
      if(!await deps.session())return json({code:"UNAUTHORIZED"},401);
      if(!validId(id))return json({code:"ORDER_NOT_FOUND"},404);
      try {
        const bytes=await deps.readLabel(id);
        if(!bytes)return json({code:"SHIPMENT_LABEL_PENDING"},404);
        return new Response(new Uint8Array(bytes),{headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="canela-${id.slice(0,8)}.pdf"`}});
      } catch {
        console.error(JSON.stringify({event:"shipment_label_read_failed"}));
        return json({code:"SHIPMENT_UNAVAILABLE"},503);
      }
    },
  };
}
