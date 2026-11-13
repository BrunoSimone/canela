import { invalidatePublicCatalog } from '@/modules/catalog/infrastructure/public-cache';
import { getDatabase } from '@/db/client';
import { currentAdminSession } from '@/modules/admin/infrastructure/admin-request';
import { catalogHandlers } from '@/modules/catalog/presentation/catalog-http';
import { CatalogRepository } from '@/modules/catalog/infrastructure/postgres/catalog-repository';
import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { PostgresInventory } from '@/modules/inventory/infrastructure/postgres-inventory';
import { MediaRepository } from '@/modules/media/infrastructure/media-repository';
import { NeonImageStore } from '@/modules/media/infrastructure/neon-image-store';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const handlers=catalogHandlers({session:currentAdminSession,enabled:databaseCatalog,repository:()=>new CatalogRepository(getDatabase()),inventory:()=>new PostgresInventory(getDatabase()),media:()=>new MediaRepository(getDatabase()),prepare:async doc=>{const store=new NeonImageStore();try{await new MediaRepository(getDatabase()).prepare(doc,store);}finally{store.close();}}});
export const GET=handlers.get;
export async function POST(request:Request){const response=await handlers.post(request);if(response.ok)invalidatePublicCatalog();return response;}
