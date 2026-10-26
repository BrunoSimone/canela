import { SignedCourierQuoteService } from "../infrastructure/signed-courier-quote";
import { describe,it,expect,vi } from "vitest";
import { FulfillOrder } from "./fulfill-order";
import { fulfillmentFixture } from "../testing/fulfillment-fixture";
import type { ShipmentRecord } from "../domain/fulfillment";
async function setup(){
  const f=await fulfillmentFixture();let stored:ShipmentRecord|null=null;
  const repo={loadOrder:vi.fn(async()=>f.order),get:vi.fn(async()=>stored),
    claim:vi.fn(async(request:typeof f.request)=>{stored={...f.record,request,externalId:request.externalId};return{record:stored,acquired:true};}),
    saveRemote:vi.fn(async(_id:string,remote:typeof f.remote)=>stored={...stored!,remote,state:"created"}),
    mark:vi.fn(async(_id:string,state:"uncertain"|"review",code:string)=>stored={...stored!,state,lastError:code}),
    saveLabel:vi.fn(async()=>stored={...stored!,state:"label_ready"}),readLabel:vi.fn(async()=>null)};
  const gateway={quoteShipment:vi.fn(async()=>[f.request.quote]),create:vi.fn(async()=>f.remote),find:vi.fn(async()=>f.remote),label:vi.fn(async():Promise<Uint8Array|null>=>Buffer.from("%PDF-test"))};
  return {...f,repo,gateway,service:new FulfillOrder(repo,gateway,f.context),store:(r:ShipmentRecord)=>{stored=r;}};
}
describe("fulfillment after paid preparation",()=>{
  it("creates and retrieves a label once after explicit confirmation",async()=>{
    const f=await setup();expect((await f.service.confirm(f.order.id,1,"owner@example.com")).state).toBe("label_ready");
    expect((await f.service.confirm(f.order.id,1,"owner@example.com")).state).toBe("label_ready");
    expect(f.gateway.create).toHaveBeenCalledTimes(1);expect(f.gateway.label).toHaveBeenCalledTimes(1);
    expect(f.repo.claim.mock.calls[0][0].externalId).toHaveLength(30);
    expect(f.gateway.create.mock.invocationCallOrder[0]).toBeGreaterThan(f.repo.claim.mock.invocationCallOrder[0]);
  });
  it.each(["unpaid","version","document","phone","origin","mode","parcel","subtotal","destination"])("rejects %s before the external POST",async(kind)=>{
    const f=await setup();
    if(kind==="unpaid")f.order.status="payment_pending";
    if(kind==="version")f.order.preparation!.version=2;
    if(kind==="document")f.order.delivery!.recipientDocument=null;
    if(kind==="phone")f.order.delivery!.phone=null;
    if(kind==="origin")f.order.quote!.contextFingerprint="d".repeat(64);
    if(kind==="mode")f.order.quote!.accountMode="operational";
    if(kind==="parcel")f.order.preparation!.parcels[0].weightGrams++;
    if(kind==="subtotal")f.order.subtotalCents++;
    if(kind==="destination")f.order.delivery!.postalCode="1426";
    await expect(f.service.confirm(f.order.id,1,"owner@example.com")).rejects.toThrow();
    expect(f.gateway.create).not.toHaveBeenCalled();expect(f.repo.claim).not.toHaveBeenCalled();
  });
  it.each(["amountCents","sellerAmountCents"] as const)("rejects changed %s before claiming",async field=>{
    const f=await setup();f.gateway.quoteShipment.mockResolvedValue([{...f.request.quote,[field]:1}]);
    await expect(f.service.confirm(f.order.id,1,"owner@example.com")).rejects.toThrow("SHIPMENT_RATE_CHANGED");
    expect(f.repo.claim).not.toHaveBeenCalled();
  });
  it("recovers an uncertain POST by reference without submitting again",async()=>{
    const f=await setup();f.gateway.create.mockRejectedValue(new Error("timeout"));
    expect((await f.service.confirm(f.order.id,1,"owner@example.com")).state).toBe("uncertain");
    expect((await f.service.recover(f.order.id)).state).toBe("label_ready");
    expect(f.gateway.create).toHaveBeenCalledTimes(1);expect(f.gateway.find).toHaveBeenCalledTimes(1);
  });
  it("does not recreate a still unfindable shipment",async()=>{
    const f=await setup();f.store({...f.record,state:"uncertain"});f.gateway.find.mockResolvedValue(null!);
    expect((await f.service.recover(f.order.id)).state).toBe("uncertain");expect(f.gateway.create).not.toHaveBeenCalled();
  });
  it("waits for a live creator and ignores a second claim",async()=>{
    const f=await setup();f.repo.claim.mockResolvedValue({record:f.record,acquired:false});
    expect((await f.service.confirm(f.order.id,1,"owner@example.com")).state).toBe("creating");
    expect(f.gateway.create).not.toHaveBeenCalled();expect(f.gateway.find).not.toHaveBeenCalled();
  });
  it("retrieves a delayed label without recreating shipment",async()=>{
    const f=await setup();f.gateway.label.mockResolvedValueOnce(null);
    expect((await f.service.confirm(f.order.id,1,"owner@example.com")).state).toBe("created");
    expect((await f.service.recover(f.order.id)).state).toBe("label_ready");expect(f.gateway.create).toHaveBeenCalledTimes(1);
  });
});

describe("prepared parcel cost approval", () => {
  it("uses measured preparation for a paid buffered quote without padding again", async () => {
    const f = await setup(), issuer = new SignedCourierQuoteService("q".repeat(32));
    const original = f.order.quote!.parcels[0];
    const base = { weightGrams: original.weightGrams, heightCm: original.heightCm, widthCm: original.widthCm, lengthCm: original.lengthCm };
    f.order.quote!.parcels[0] = { ...original, weightGrams: original.weightGrams + 100, heightCm: original.heightCm + 1,
      quoteMargin: { status: "applied", base } };
    const service = new FulfillOrder(f.repo, f.gateway, f.context, issuer);
    const approval = await service.preview(f.order.id, 1);
    expect(f.gateway.quoteShipment).toHaveBeenCalledWith(expect.objectContaining({ parcels: [expect.objectContaining(base)] }));
    expect(issuer.authenticate(approval.quoteToken).parcels[0].quoteMargin).toBeUndefined();
    await service.confirm(f.order.id, 1, "owner", approval.quoteToken);
    expect(f.repo.claim.mock.calls[0][0].quote.parcels[0]).toMatchObject(base);
    expect(f.repo.claim.mock.calls[0][0].originalQuote!.parcels[0].quoteMargin?.status).toBe("applied");
    expect(f.gateway.create).toHaveBeenCalledTimes(1);
  });
  it("previews changed measures and creates only after approving the new cost", async () => {
    const f = await setup();
    const issuer = new SignedCourierQuoteService("q".repeat(32));
    const service = new FulfillOrder(f.repo, f.gateway, f.context, issuer);
    f.order.preparation!.parcels[0].weightGrams += 100;
    f.gateway.quoteShipment.mockResolvedValue([{ ...f.request.quote, amountCents: f.request.quote.amountCents + 200, sellerAmountCents: f.request.quote.sellerAmountCents + 200 }]);
    const approval = await service.preview(f.order.id, 1);
    expect(f.gateway.create).not.toHaveBeenCalled();
    await service.confirm(f.order.id, 1, "owner", approval.quoteToken);
    expect(f.gateway.create).toHaveBeenCalledTimes(1);
    expect(f.repo.claim.mock.calls[0][0].originalQuote).toEqual(f.order.quote);
    expect(f.repo.claim.mock.calls[0][0].quote.parcels[0].weightGrams).toBe(f.order.preparation!.parcels[0].weightGrams);
    expect(f.order.shippingCents).toBe(f.order.quote!.amountCents);
  });
  it("rejects changed preparation or price after approval and never posts", async () => {
    const f = await setup(), service = new FulfillOrder(f.repo, f.gateway, f.context, new SignedCourierQuoteService("q".repeat(32)));
    const approval = await service.preview(f.order.id, 1);
    f.order.preparation!.parcels[0].heightCm += 1;
    await expect(service.confirm(f.order.id, 1, "owner", approval.quoteToken)).rejects.toThrow("SHIPMENT_PREPARATION_CHANGED");
    f.order.preparation!.parcels[0].heightCm -= 1;
    f.gateway.quoteShipment.mockResolvedValue([{ ...f.request.quote, amountCents: f.request.quote.amountCents + 1 }]);
    await expect(service.confirm(f.order.id, 1, "owner", approval.quoteToken)).rejects.toThrow("SHIPMENT_RATE_CHANGED");
    expect(f.gateway.create).not.toHaveBeenCalled();
  });
  it("rejects tampered approval and a quote from a different order", async () => {
    const f = await setup(), service = new FulfillOrder(f.repo, f.gateway, f.context, new SignedCourierQuoteService("q".repeat(32)));
    const approval = await service.preview(f.order.id, 1);
    await expect(service.confirm(f.order.id, 1, "owner", approval.quoteToken + "x")).rejects.toThrow();
    f.order.id = "another";
    await expect(service.confirm(f.order.id, 1, "owner", approval.quoteToken)).rejects.toThrow("SHIPMENT_PREPARATION_CHANGED");
    expect(f.gateway.create).not.toHaveBeenCalled();
  });
});
