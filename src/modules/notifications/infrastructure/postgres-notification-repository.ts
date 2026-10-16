import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import type { CommerceEnvironment, NotificationJob, NotificationRepository, NoticeSummary, OutboundEmail } from "../domain/notification";

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly sql:Sql){}
  async claim(environment:CommerceEnvironment,orderId?:string):Promise<NotificationJob|null>{
    return this.sql.begin(async tx=>{
      const filter=orderId?tx`order_id=${orderId}`:tx`TRUE`;
      await tx`UPDATE order_notification SET state='review',last_error='MAIL_RETRY_WINDOW_EXPIRED',updated_at=now()
        WHERE environment=${environment} AND ${filter} AND state IN ('pending','sending')
        AND first_attempt_at <= now()-interval '23 hours' AND (lease_until IS NULL OR lease_until<now())`;
      const [row]=await tx`SELECT * FROM order_notification WHERE environment=${environment} AND ${filter}
        AND ((state='pending' AND available_at<=now()) OR (state='sending' AND lease_until<now()))
        ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if(!row)return null;
      const leaseToken=randomUUID();
      await tx`UPDATE order_notification SET state='sending',lease_token=${leaseToken},lease_until=now()+interval '60 seconds',attempts=attempts+1,updated_at=now() WHERE id=${row.id}`;
      return {id:row.id,orderId:row.order_id,kind:row.kind,environment:row.environment,leaseToken,attempts:row.attempts+1,payload:row.payload,firstAttemptAt:row.first_attempt_at?.toISOString()??null};
    });
  }
  async prepare(job:NotificationJob,payload:OutboundEmail):Promise<boolean>{
    const rows=await this.sql`UPDATE order_notification SET payload=COALESCE(payload,${this.sql.json(payload)}),
      first_attempt_at=COALESCE(first_attempt_at,now()),updated_at=now()
      WHERE id=${job.id} AND lease_token=${job.leaseToken} AND state='sending' AND lease_until>now()
      AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours') RETURNING id`;
    return rows.length===1;
  }
  async sent(job:NotificationJob,providerId:string):Promise<void>{
    await this.sql`UPDATE order_notification SET state='sent',provider_id=${providerId},lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now()
      WHERE id=${job.id} AND lease_token=${job.leaseToken} AND state='sending'`;
  }
  async failed(job:NotificationJob,permanent:boolean,code:string):Promise<void>{
    const seconds=Math.min(3600,30*2**Math.min(job.attempts,7));
    await this.sql`UPDATE order_notification SET state=${permanent?'review':'pending'},last_error=${code},
      lease_token=NULL,lease_until=NULL,available_at=now()+${seconds}*interval '1 second',updated_at=now()
      WHERE id=${job.id} AND lease_token=${job.leaseToken} AND state='sending'`;
  }
  async summary(orderId:string):Promise<NoticeSummary[]>{
    const rows=await this.sql`SELECT kind,state,attempts,last_error FROM order_notification WHERE order_id=${orderId} ORDER BY kind`;
    return rows.map(r=>({kind:r.kind,state:r.state,attempts:r.attempts,lastError:r.last_error}));
  }
}
