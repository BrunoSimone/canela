import { getDatabase } from '@/db/client';
import { currentAdminSession,privateJson } from '@/modules/admin/infrastructure/admin-request';
import { FrameProduction } from '@/modules/customization/infrastructure/postgres/production';
import { renderWorkshopGuide } from '@/modules/customization/infrastructure/workshop-guide';
export const runtime='nodejs';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  if(!await currentAdminSession())return privateJson({code:'UNAUTHORIZED'},401);
  const {id}=await context.params;
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return privateJson({code:'NOT_FOUND'},404);
  const frame=await new FrameProduction(getDatabase()).get(id);
  if(!frame)return privateJson({code:'PAID_FRAME_REQUIRED'},404);
  return new Response(renderWorkshopGuide(id,frame.snapshot,frame.environment==='test'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'}});
}
