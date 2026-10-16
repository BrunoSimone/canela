import { after } from "next/server";
import { adminOperations } from "@/modules/notifications/infrastructure/admin-operations";
import { tryOrderNotifications } from "@/modules/notifications/infrastructure/notification-service";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;const response=await adminOperations().dispatch(request,id);
 if(response.ok)after(()=>tryOrderNotifications(id));return response;
}
