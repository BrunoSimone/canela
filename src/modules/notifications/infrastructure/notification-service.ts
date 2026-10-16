import { getDatabase } from "@/db/client";
import { deliverNotification } from "../application/deliver-notification";
import { readOrderMailConfig, validateFrozenMail } from "./mail-config";
import { PostgresNotificationRepository } from "./postgres-notification-repository";
import { renderNotification } from "./order-mail";
import { sendResendEmail } from "./resend-mailer";
export async function processOrderNotifications(orderId?:string,limit=2):Promise<number>{
  const config=readOrderMailConfig();if(!config)return 0;
  const sql=getDatabase(),repo=new PostgresNotificationRepository(sql);let processed=0;
  for(let i=0;i<Math.min(Math.max(limit,1),5);i++){
    if(i>0)await new Promise(resolve=>setTimeout(resolve,600));
    if(!await deliverNotification({repo,environment:config.environment,render:job=>renderNotification(sql,config,job),
      validate:(job,payload)=>validateFrozenMail(config,job.environment,payload,job.kind),send:(payload,key)=>sendResendEmail(config.apiKey,payload,key)},orderId))break;
    processed++;
  }
  return processed;
}
export async function tryOrderNotifications(orderId?:string):Promise<void>{
  try{await processOrderNotifications(orderId);}catch{console.error(JSON.stringify({event:"order_notification_worker_failed"}));}
}
