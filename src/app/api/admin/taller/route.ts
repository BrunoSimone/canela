import { getDatabase } from '@/db/client';
import { currentAdminSession,privateJson } from '@/modules/admin/infrastructure/admin-request';
import { isSameOriginAdminRequest } from '@/modules/admin/infrastructure/admin-origin';
import { paymentEnvironment } from '@/modules/payments/infrastructure/server/payment-environment';
import { PostgresWorkshopRepository } from '@/modules/customization/infrastructure/postgres/workshop-repository';
import { FrameCommerceError } from '@/modules/customization/domain/workshop';
import type { WorkshopDocument } from '@/modules/customization/domain/workshop-document';
import { boundedJson } from '@/modules/customization/presentation/demo-purchase-http';
import { DemoPurchaseError } from '@/modules/customization/domain/purchase';
export const runtime='nodejs';
export async function POST(request:Request){
 const session=await currentAdminSession();if(!session)return privateJson({code:'UNAUTHORIZED'},401);
 if(!isSameOriginAdminRequest(request))return privateJson({code:'ORIGIN'},403);
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return privateJson({code:'CONTENT_TYPE'},415);
 try{
  const body=await boundedJson(request);
  if(!['save','publish','pause'].includes(String(body.action)))return privateJson({code:'INVALID_INPUT'},422);
  return privateJson(await new PostgresWorkshopRepository(getDatabase(),paymentEnvironment()).save(body.version as number,body.document as WorkshopDocument,body.action as 'save'|'publish'|'pause',session.email));
 }catch(e){
  if(e instanceof FrameCommerceError||e instanceof DemoPurchaseError)return privateJson({code:e.code,error:e.message},e.status);
  return privateJson({code:'UNAVAILABLE',error:'No pudimos guardar. Tu borrador sigue en pantalla; reintentá en unos momentos.'},503);
 }
}
