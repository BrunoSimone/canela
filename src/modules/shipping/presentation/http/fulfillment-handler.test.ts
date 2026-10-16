import {describe,it,expect,vi} from "vitest";
import {createFulfillmentHandlers} from "./fulfillment-handler";
import {FulfillOrder} from "../../application/fulfill-order";
import {fulfillmentFixture} from "../../testing/fulfillment-fixture";
import {ExpiredShippingQuoteError} from "../../domain/shipping-quote";
const id="d71466b7-f0e7-4434-bd72-047287217728";
async function setup(){
  const {record}=await fulfillmentFixture();
  const service=Object.create(FulfillOrder.prototype) as FulfillOrder;
  service.confirm=vi.fn().mockResolvedValue(record);service.recover=vi.fn().mockResolvedValue(record);
  const deps={session:vi.fn(async():Promise<{email:string}|null>=>({email:"owner@example.com"})),service:vi.fn(()=>service),readLabel:vi.fn(async():Promise<Uint8Array|null>=>Buffer.from("%PDF-test"))};
  return {deps,service,handlers:createFulfillmentHandlers(deps)};
}
function request(body:unknown={action:"confirm",expectedPreparationVersion:1},origin="https://canela.test",query=""){
  return new Request(`https://canela.test/api/admin/orders/${id}/shipment${query}`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
}
describe("authenticated shipment actions",()=>{
  it("previews the prepared quote without creating a shipment and passes approval on confirmation",async()=>{
    const f=await setup();
    f.service.preview=vi.fn().mockResolvedValue({quoteToken:"signed-prepared-quote",amountCents:100,sellerAmountCents:100,customerPaidCents:90,differenceCents:10,expiresAt:"2026-10-16T18:00:00Z"});
    const response=await f.handlers.post(request({action:"preview",expectedPreparationVersion:2}),id);
    expect(response.status).toBe(200);expect((await response.json()).differenceCents).toBe(10);
    expect(f.service.preview).toHaveBeenCalledWith(id,2);expect(f.service.confirm).not.toHaveBeenCalled();
    expect((await f.handlers.post(request({action:"confirm",expectedPreparationVersion:2,approvedQuoteToken:"signed-prepared-quote"}),id)).status).toBe(200);
    expect(f.service.confirm).toHaveBeenCalledWith(id,2,"owner@example.com","signed-prepared-quote");
  });
  it("requires a fresh quote when the operator approval expires",async()=>{
    const f=await setup();vi.mocked(f.service.confirm).mockRejectedValue(new ExpiredShippingQuoteError());
    const response=await f.handlers.post(request({action:"confirm",expectedPreparationVersion:1,approvedQuoteToken:"expired"}),id);
    expect(response.status).toBe(409);expect(await response.json()).toEqual({code:"SHIPMENT_APPROVAL_EXPIRED"});
  });
  it("rejects unauthenticated reads and writes before touching the provider or PDF",async()=>{
    const f=await setup();f.deps.session.mockResolvedValue(null);
    expect((await f.handlers.post(request(),id)).status).toBe(401);expect((await f.handlers.label(id)).status).toBe(401);
    expect(f.deps.service).not.toHaveBeenCalled();expect(f.deps.readLabel).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and demo mutations",async()=>{
    const f=await setup();expect((await f.handlers.post(request({},"https://evil.test"),id)).status).toBe(403);
    expect((await f.handlers.post(request({},"https://canela.test","?demo=1"),id)).status).toBe(403);expect(f.deps.service).not.toHaveBeenCalled();
  });
  it.each([{},[],{action:"confirm",expectedPreparationVersion:0},{action:"confirm",expectedPreparationVersion:1,note:"x".repeat(2048)}])("rejects malformed or oversized input",async value=>{
    const f=await setup();expect((await f.handlers.post(request(value),id)).status).toBe(422);expect(f.deps.service).not.toHaveBeenCalled();
  });
  it("returns a private summary without the shipping request or document",async()=>{
    const f=await setup();const response=await f.handlers.post(request(),id);expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body=await response.text();expect(body).not.toContain("recipientDocument");expect(body).not.toContain("buyer@example.com");
    expect(f.service.confirm).toHaveBeenCalledWith(id,1,"owner@example.com");
  });
  it("serves the saved PDF only, with attachment and no-cache headers",async()=>{
    const f=await setup();const response=await f.handlers.label(id);expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("%PDF-test");expect(f.deps.service).not.toHaveBeenCalled();
  });
  it("redacts a database failure when downloading the PDF",async()=>{
    const f=await setup();f.deps.readLabel.mockRejectedValue(new Error("private database connection details"));
    const response=await f.handlers.label(id);
    expect(response.status).toBe(503);expect(await response.json()).toEqual({code:"SHIPMENT_UNAVAILABLE"});
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
