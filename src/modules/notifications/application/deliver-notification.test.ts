import { describe, expect, it, vi } from "vitest";
import { deliverNotification } from "./deliver-notification";
import type { NotificationJob, OutboundEmail } from "../domain/notification";

const payload:OutboundEmail={from:"Canela <pedidos@canela.test>",to:["tester@example.com"],subject:"[PRUEBA] Pedido",html:"<p>Prueba</p>",text:"Prueba"};
function fixture(){
  const job:NotificationJob={id:"notice-1",orderId:"order-1",kind:"owner_paid",environment:"test",leaseToken:"lease-1",attempts:1,payload:null,firstAttemptAt:null};
  const repo={claim:vi.fn().mockResolvedValue(job),prepare:vi.fn().mockResolvedValue(true),sent:vi.fn(),failed:vi.fn()};
  const render=vi.fn().mockResolvedValue(payload),send=vi.fn().mockResolvedValue("email-1");
  return {job,repo,render,send};
}
describe("OPS-05 mail delivery",()=>{
  it("persists payload before sending and acknowledges acceptance",async()=>{
    const f=fixture();await deliverNotification({...f,environment:"test"});
    expect(f.repo.prepare.mock.invocationCallOrder[0]).toBeLessThan(f.send.mock.invocationCallOrder[0]);
    expect(f.send).toHaveBeenCalledWith(payload,"canela-notice/notice-1");expect(f.repo.sent).toHaveBeenCalledWith(f.job,"email-1");
  });
  it("replays the exact frozen request after an uncertain send",async()=>{
    const f=fixture();f.job.payload=payload;f.job.firstAttemptAt=new Date().toISOString();
    f.send.mockRejectedValue(new Error("timeout with private info"));
    await deliverNotification({...f,environment:"test"});
    expect(f.render).not.toHaveBeenCalled();expect(f.send).toHaveBeenCalledWith(payload,"canela-notice/notice-1");
    expect(f.repo.failed).toHaveBeenCalledWith(f.job,false,"MAIL_RETRY");expect(f.repo.sent).not.toHaveBeenCalled();
  });
  it("does not send after losing the lease while preparing",async()=>{
    const f=fixture();f.repo.prepare.mockResolvedValue(false);await deliverNotification({...f,environment:"test"});expect(f.send).not.toHaveBeenCalled();
  });
  it("retains uncertainty when acknowledgement fails after remote acceptance",async()=>{
    const f=fixture();f.repo.sent.mockRejectedValue(new Error("db"));await deliverNotification({...f,environment:"test"});expect(f.repo.failed).toHaveBeenCalledWith(f.job,false,"MAIL_RETRY");
  });
});
