import {describe,it,expect,vi} from "vitest";
import {handleNotificationWorker} from "./worker-handler";
const secret="s".repeat(40);
const request=(authorization?:string)=>new Request("https://canela.test/api/internal/notifications",{method:"POST",headers:authorization?{Authorization:authorization}:{}});
describe("OPS-06 protected worker",()=>{
 it.each([undefined,"Bearer wrong",`Bearer ${"é".repeat(40)}`])("rejects missing, wrong and non-ASCII credentials",async authorization=>{
  const run=vi.fn();const r=await handleNotificationWorker(request(authorization),secret,run);
  expect(r.status).toBe(401);expect(run).not.toHaveBeenCalled();expect(r.headers.get("Cache-Control")).toBe("no-store");
 });
 it("fails closed without a configured secret",async()=>{expect((await handleNotificationWorker(request(),undefined,vi.fn())).status).toBe(503);});
 it("only returns a count for an authorized invocation",async()=>{
  const r=await handleNotificationWorker(request(`Bearer ${secret}`),secret,vi.fn(async()=>2));expect(await r.json()).toEqual({processed:2});
 });
 it("redacts internal exceptions",async()=>{
  const r=await handleNotificationWorker(request(`Bearer ${secret}`),secret,vi.fn(async()=>{throw Error("secret")}));
  expect(r.status).toBe(503);expect(await r.text()).not.toContain("secret");
 });
});

it("reports review and overdue notices as failed health checks", async () => {
  const secret = "s".repeat(32);
  const request = new Request("https://canela.test/api/internal/notifications", { headers: { Authorization: `Bearer ${secret}` } });
  const response = await handleNotificationWorker(request, secret, async () => ({ processed: 2, review: 1, overdue: 0 }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ processed: 2, review: 1, overdue: 0 });
});

it("MAN-04 reports remaining expired reservations for manual recovery", async () => {
  const response = await handleNotificationWorker(request(`Bearer ${secret}`), secret,
    async () => ({ processed: 0, review: 0, overdue: 0, expiredReservations: 2 }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ processed: 0, review: 0, overdue: 0, expiredReservations: 2 });
});

it("MAN-04 accepts a completed manual run without requiring a scheduler", async () => {
  const response = await handleNotificationWorker(request(`Bearer ${secret}`), secret,
    async () => ({ processed: 1, review: 0, overdue: 0, expiredReservations: 0 }));
  expect(response.status).toBe(200);
});
