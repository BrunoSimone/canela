import { adminOperations } from "@/modules/notifications/infrastructure/admin-operations";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 return adminOperations().retry(request,(await context.params).id);
}
