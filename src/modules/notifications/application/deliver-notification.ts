import { MailDeliveryError, type CommerceEnvironment, type NotificationJob, type NotificationRepository, type OutboundEmail } from "../domain/notification";

type Dependencies={repo:NotificationRepository;environment:CommerceEnvironment;render:(job:NotificationJob)=>Promise<OutboundEmail>;send:(payload:OutboundEmail,key:string)=>Promise<string>;validate?:(job:NotificationJob,payload:OutboundEmail)=>void};
export async function deliverNotification(deps:Dependencies,orderId?:string):Promise<boolean>{
  const job=await deps.repo.claim(deps.environment,orderId);if(!job)return false;
  try{
    const payload=job.payload??await deps.render(job);
    deps.validate?.(job,payload);
    if(!await deps.repo.prepare(job,payload))return false;
    const id=await deps.send(payload,`canela-notice/${job.id}`);
    await deps.repo.sent(job,id);
  }catch(error){
    await deps.repo.failed(job,error instanceof MailDeliveryError&&error.permanent,error instanceof MailDeliveryError?error.code:"MAIL_RETRY");
  }
  return true;
}
