import { getDatabase } from '@/db/client';
import { currentAdminSession } from '@/modules/admin/infrastructure/admin-request';
import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { AdminUpload } from '@/modules/media/application/admin-upload';
import { uploadHandler } from '@/modules/media/application/upload-http';
import { NeonImageStore } from '@/modules/media/infrastructure/neon-image-store';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request:Request){let store:NeonImageStore|undefined;try{return await uploadHandler({session:currentAdminSession,enabled:databaseCatalog,service:()=>new AdminUpload(getDatabase(),store??=new NeonImageStore())})(request);}finally{store?.close();}}
