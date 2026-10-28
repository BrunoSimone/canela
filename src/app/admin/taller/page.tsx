import { redirect } from 'next/navigation';
import { getDatabase } from '@/db/client';
import { currentAdminSession } from '@/modules/admin/infrastructure/admin-request';
import { AdminShell } from '@/modules/admin/presentation/admin-shell';
import { paymentEnvironment } from '@/modules/payments/infrastructure/server/payment-environment';
import { PostgresWorkshopRepository } from '@/modules/customization/infrastructure/postgres/workshop-repository';
import { WorkshopEditor } from '@/modules/customization/presentation/workshop-editor';
export const dynamic='force-dynamic';
export const metadata={title:'Taller de cuadros | Canela',robots:{index:false,follow:false}};
export default async function WorkshopPage(){
 const session=await currentAdminSession();if(!session)redirect('/admin/ingresar');
 const settings=await new PostgresWorkshopRepository(getDatabase(),paymentEnvironment()).settings();
 return <AdminShell demo={false} email={session.email}><WorkshopEditor initial={settings}/></AdminShell>;
}
