import { after } from 'next/server';
import { tryOrderNotifications } from '@/modules/notifications/infrastructure/notification-service';
import { recoverFramePayment } from '@/modules/customization/infrastructure/recover-frame-payment';
import { getDatabase } from '@/db/client';
import { currentAdminSession,privateJson } from '@/modules/admin/infrastructure/admin-request';
import { isSameOriginAdminRequest } from '@/modules/admin/infrastructure/admin-origin';
import { PostgresAdminOrderReader } from '@/modules/admin/infrastructure/postgres-order-reader';
import { FrameProduction } from '@/modules/customization/infrastructure/postgres/production';
import { createGalleryPublisher } from '@/modules/customization/infrastructure/gallery-publisher';
import { FrameCommerceError } from '@/modules/customization/domain/workshop';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {
  const session=await currentAdminSession();if(!session)return privateJson({code:'UNAUTHORIZED'},401);
  if(!isSameOriginAdminRequest(request))return privateJson({code:'ORIGIN'},403);
  const {id}=await context.params;if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return privateJson({code:'NOT_FOUND'},404);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return privateJson({code:'INVALID_INPUT'},422);
  try {
    const raw=await request.text();if(raw.length>4096)return privateJson({code:'BODY_TOO_LARGE'},413);
    const body=JSON.parse(raw),sql=getDatabase();
    if(body.action==='reconcile'){await recoverFramePayment(sql,id,session.email);after(()=>tryOrderNotifications());return privateJson(await new PostgresAdminOrderReader(sql).get(id));}
    if(body.action==='gallery')return privateJson(await createGalleryPublisher(sql).prepare(id,session.email));
    if(!Number.isSafeInteger(body.version)||!['making','ready'].includes(body.state))return privateJson({code:'INVALID_INPUT'},422);
    await new FrameProduction(sql).advance(id,body.version,body.state,session.email);
    return privateJson(await new PostgresAdminOrderReader(sql).get(id));
  } catch(e) {
    if(e instanceof FrameCommerceError)return privateJson({code:e.code,error:e.message},e.status);
    if(e instanceof SyntaxError)return privateJson({code:'INVALID_INPUT'},422);
    return privateJson({code:'FRAME_UNAVAILABLE',error:'No pudimos guardar el cambio. Actualizá la ficha antes de reintentar.'},503);
  }
}
