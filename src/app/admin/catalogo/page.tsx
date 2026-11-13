import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentAdminSession } from '@/modules/admin/infrastructure/admin-request';
import { AdminShell } from '@/modules/admin/presentation/admin-shell';
import { CatalogPanel } from '@/modules/catalog/presentation/catalog-panel';
import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
export const dynamic='force-dynamic';
export const metadata={title:'Catálogo y stock | Canela',robots:{index:false,follow:false}};
export default async function CatalogPage(){
 const session=await currentAdminSession();if(!session)redirect('/admin/ingresar');
 return <AdminShell demo={false} email={session.email}>{databaseCatalog()?<Suspense fallback={<p>Cargando catálogo…</p>}><CatalogPanel/></Suspense>:<main style={{padding:32}}><h1>Catálogo y stock</h1><p>La migración sigue en preparación. Por ahora, cargá los productos en Sanity.</p><a href="https://canela-artesanal.sanity.studio">Abrir catálogo actual</a></main>}</AdminShell>;
}
