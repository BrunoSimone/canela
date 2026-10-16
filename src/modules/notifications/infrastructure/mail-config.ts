import { MailDeliveryError, type CommerceEnvironment, type NotificationKind, type OutboundEmail } from "../domain/notification";
export type OrderMailConfig={environment:CommerceEnvironment;apiKey:string;from:string;siteUrl:string;ownerEmail:string|null;testTo:string|null};
export const validEmail=(value:string|undefined):value is string=>!!value&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export function readOrderMailConfig(env:Record<string,string|undefined>=process.env):OrderMailConfig|null{
  const mode=env.ORDER_EMAIL_MODE??"disabled";if(mode==="disabled")return null;
  const from=env.ORDER_EMAIL_FROM?.trim(),apiKey=env.RESEND_API_KEY?.trim();
  const fromAddress=from?.match(/<([^<>]+)>$/)?.[1]??from;
  if(!["test","production"].includes(mode)||!apiKey||!validEmail(fromAddress)||/[\r\n]/.test(from??""))throw Error("ORDER_MAIL_CONFIG_REQUIRED");
  const url=new URL(env.NEXT_PUBLIC_SITE_URL??"");
  if(url.username||url.password||!(url.protocol==="https:"||(mode==="test"&&url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname))))throw Error("ORDER_MAIL_HTTPS_REQUIRED");
  if(mode==="test"&&!validEmail(env.ORDER_EMAIL_TEST_TO))throw Error("ORDER_MAIL_TEST_RECIPIENT_REQUIRED");
  if(mode==="production"&&(env.COMMERCE_PRODUCTION_APPROVED!=="1"||env.PAYMENT_ENVIRONMENT!=="production"||!validEmail(env.ORDER_OWNER_EMAIL)))throw Error("ORDER_MAIL_PRODUCTION_NOT_APPROVED");
  return {environment:mode as CommerceEnvironment,apiKey,from:from!,siteUrl:url.origin,ownerEmail:env.ORDER_OWNER_EMAIL??null,testTo:mode==="test"?env.ORDER_EMAIL_TEST_TO!:null};
}
export function validateFrozenMail(config:OrderMailConfig,environment:CommerceEnvironment,payload:OutboundEmail,kind?:NotificationKind):void{
  if(environment!==config.environment||payload.from!==config.from||payload.to.length!==1||!validEmail(payload.to[0])||
    (environment==="test"&&payload.to[0]!==config.testTo)||
    (environment==="production"&&kind==="owner_paid"&&payload.to[0]!==config.ownerEmail))throw new MailDeliveryError(true,"MAIL_CONFIG_CHANGED");
}
