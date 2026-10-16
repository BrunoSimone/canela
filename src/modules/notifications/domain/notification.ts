export type CommerceEnvironment = "test" | "production";
export type NotificationKind = "owner_paid" | "buyer_shipped";
export type OutboundEmail = { from:string; to:string[]; subject:string; html:string; text:string };
export type NotificationJob = {
  id:string; orderId:string; kind:NotificationKind; environment:CommerceEnvironment;
  leaseToken:string; attempts:number; payload:OutboundEmail|null; firstAttemptAt:string|null;
};
export type NoticeSummary = {kind:NotificationKind;state:"pending"|"sending"|"sent"|"review";attempts:number;lastError:string|null};
export interface NotificationRepository {
  claim(environment:CommerceEnvironment,orderId?:string):Promise<NotificationJob|null>;
  prepare(job:NotificationJob,payload:OutboundEmail):Promise<boolean>;
  sent(job:NotificationJob,providerId:string):Promise<void>;
  failed(job:NotificationJob,permanent:boolean,code:string):Promise<void>;
}
export class MailDeliveryError extends Error {
  constructor(readonly permanent:boolean,readonly code:string){super(code);}
}
