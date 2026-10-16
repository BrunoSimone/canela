import { describe, expect, it, vi } from "vitest";
import { operationsHandlers } from "./operations-handler";
const id="d71466b7-f0e7-4434-bd72-047287217728";
function setup(){const deps={session:vi.fn(async()=>({email:"owner@example.com"})),enabled:()=>true,mailEnabled:()=>true,dispatch:vi.fn(),process:vi.fn(),summary:vi.fn(async()=>[])};return {deps,handlers:operationsHandlers(deps)};}
function request(body:unknown={confirmHandedOver:true,expectedRemoteId:123},origin="https://canela.test",query=""){
 return new Request(`https://canela.test/api/admin/orders/${id}/dispatch${query}`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
describe("OPS administrative actions",()=>{
 it.each(["dispatch","retry"] as const)("rejects unauthenticated %s",async action=>{
   const f=setup();f.deps.session.mockResolvedValue(null as never);expect((await f.handlers[action](request(),id)).status).toBe(401);expect(f.deps.dispatch).not.toHaveBeenCalled();expect(f.deps.process).not.toHaveBeenCalled();
 });
 it.each(["dispatch","retry"] as const)("rejects external origin and demo for %s",async action=>{
   const f=setup();expect((await f.handlers[action](request({},"https://evil.test"),id)).status).toBe(403);expect((await f.handlers[action](request({},"https://canela.test","?demo=1"),id)).status).toBe(403);
 });
 it.each([{}, {confirmHandedOver:false,expectedRemoteId:123},{confirmHandedOver:true,expectedRemoteId:0},{confirmHandedOver:true,expectedRemoteId:123,note:"x".repeat(2048)}])("requires explicit valid confirmation",async body=>{
   const f=setup();expect((await f.handlers.dispatch(request(body),id)).status).toBe(422);expect(f.deps.dispatch).not.toHaveBeenCalled();
 });
 it("saves the actor and returns private responses",async()=>{
   const f=setup();f.deps.dispatch.mockResolvedValue({dispatchedAt:"2026-10-14T12:00:00Z"});const res=await f.handlers.dispatch(request(),id);
   expect(res.status).toBe(200);expect(res.headers.get("Cache-Control")).toBe("private, no-store");expect(f.deps.dispatch).toHaveBeenCalledWith(id,123,"owner@example.com");
 });
 it("never dispatches when fulfillment is disabled",async()=>{
   const f=setup();f.deps.enabled=()=>false;expect((await f.handlers.dispatch(request(),id)).status).toBe(503);expect(f.deps.dispatch).not.toHaveBeenCalled();
 });
});
