import {describe,it,expect,vi} from "vitest";
import {ZipnovaFulfillmentClient,safeTrackingUrl} from "./fulfillment-client";
import {fulfillmentFixture} from "../../testing/fulfillment-fixture";
const config={apiToken:"test-token",apiSecret:"test-secret",accountId:1,originId:2,dispatchType:"carrier_dropoff" as const};
async function fixture(){
  const f=await fulfillmentFixture(),p=f.request.quote.parcels[0];
  const body={id:123,account_id:1,origin:{id:2},external_id:f.request.externalId,carrier:{id:f.request.quote.carrierId},logistic_type:"carrier_dropoff",service_type:"standard_delivery",status:"new",
    destination:{zipcode:f.request.delivery.postalCode,document:f.request.delivery.recipientDocument,street_number:f.request.delivery.streetNumber},declared_value:f.request.quote.merchandiseCents/100,price_incl_tax:f.request.quote.amountCents/100,
    packages:[{weight:p.weightGrams,height:p.heightCm,width:p.widthCm,length:p.lengthCm}],tracking:"https://tracking.example.com/test"};
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json(body,{status:201}));
  return {...f,body,fetcher,client:new ZipnovaFulfillmentClient(config,fetcher)};
}
describe("Zipnova fulfillment adapter",()=>{
  it("sends the explicit carrier, recipient and package without choosing another carrier",async()=>{
    const f=await fixture();expect((await f.client.create(f.request)).id).toBe(123);
    const [url,init]=f.fetcher.mock.calls[0];expect(url).toBe("https://api.zipnova.com.ar/v2/shipments");expect(init?.redirect).toBe("error");
    const body=JSON.parse(init?.body as string);expect(body).toMatchObject({external_id:"CA-test",carrier_id:f.request.quote.carrierId,process_immediately:1,destination:{document:"12345678",phone:f.request.delivery.phone},logistic_type:"carrier_dropoff"});
    expect(body.packages).toHaveLength(1);
  });
  it.each(["account_id","external_id","origin","carrier","destination","packages"])("rejects inconsistent %s",async field=>{
    const f=await fixture();f.fetcher.mockResolvedValue(Response.json({...f.body,[field]:null},{status:201}));await expect(f.client.create(f.request)).rejects.toThrow();
  });
  it.each([401,403,422,429,500,503])("keeps HTTP %s failures redacted",async status=>{
    const f=await fixture();f.fetcher.mockResolvedValue(Response.json({error:"private data"},{status}));await expect(f.client.create(f.request)).rejects.toThrow("SHIPMENT_PROVIDER_UNAVAILABLE");
  });
  it("finds the exact reference then validates the full shipment",async()=>{
    const f=await fixture();f.fetcher.mockResolvedValueOnce(Response.json({data:[{id:123,account_id:1,external_id:"CA-test"}]})).mockResolvedValueOnce(Response.json(f.body));
    expect((await f.client.find(f.request))?.id).toBe(123);expect(f.fetcher.mock.calls.map(c=>c[1]?.method??"GET")).toEqual(["GET","GET"]);
  });
  it("does not guess when duplicate external references exist",async()=>{
    const f=await fixture();const row={id:123,account_id:1,external_id:"CA-test"};f.fetcher.mockResolvedValue(Response.json({data:[row,row]}));await expect(f.client.find(f.request)).rejects.toThrow("SHIPMENT_REMOTE_CONFLICT");
  });
  it("downloads the observed base64 body as PDF without changing remote status",async()=>{
    const f=await fixture();f.fetcher.mockResolvedValue(Response.json({format:"pdf",body:Buffer.from("%PDF-test").toString("base64")}));
    expect(Buffer.from((await f.client.label(123))!).toString()).toBe("%PDF-test");expect(f.fetcher.mock.calls[0][0]).toContain("no_status_change=1");
  });
  it.each([{format:"html",body:"xxx"},{format:"pdf",body:Buffer.from("<html>fake</html>").toString("base64")}])("rejects non-PDF labels",async body=>{
    const f=await fixture();f.fetcher.mockResolvedValue(Response.json(body));await expect(f.client.label(123)).rejects.toThrow("SHIPMENT_INVALID_LABEL");
  });
  it("allows delayed labels without implying another shipment is needed",async()=>{
    const f=await fixture();f.fetcher.mockResolvedValue(Response.json({}, {status:409}));expect(await f.client.label(123)).toBeNull();
  });
  it.each(["javascript:alert(1)","http://test.test/","https://user:password@test.test/"])("rejects unsafe tracking URL %s",url=>expect(safeTrackingUrl(url)).toBeNull());
});
