import { describe, expect, it, vi } from "vitest";
import { readOrderMailConfig, validateFrozenMail } from "./mail-config";
import { sendResendEmail } from "./resend-mailer";
const env={ORDER_EMAIL_MODE:"test",ORDER_EMAIL_TEST_TO:"tester@example.com",ORDER_EMAIL_FROM:"Canela <pedidos@canela.test>",RESEND_API_KEY:"secret",NEXT_PUBLIC_SITE_URL:"http://localhost:3000"};
const mail={from:env.ORDER_EMAIL_FROM,to:[env.ORDER_EMAIL_TEST_TO],subject:"test",html:"<p>test</p>",text:"test"};
describe("OPS-07 email isolation",()=>{
  it("defaults to disabled and requires an explicit test destination",()=>{
    expect(readOrderMailConfig({})).toBeNull();expect(()=>readOrderMailConfig({...env,ORDER_EMAIL_TEST_TO:undefined})).toThrow();
    expect(readOrderMailConfig(env)).toMatchObject({environment:"test",testTo:"tester@example.com"});
  });
  it("rejects production without approval or owner address and HTTPS",()=>{
    for(const override of [{},{COMMERCE_PRODUCTION_APPROVED:"1"},{COMMERCE_PRODUCTION_APPROVED:"1",ORDER_OWNER_EMAIL:"owner@example.com"}])
      expect(()=>readOrderMailConfig({...env,...override,ORDER_EMAIL_MODE:"production"})).toThrow();
  });
  it("blocks replay to a buyer or mismatched environment in test",()=>{
    const config=readOrderMailConfig(env)!;
    expect(()=>validateFrozenMail(config,"test",mail)).not.toThrow();
    expect(()=>validateFrozenMail(config,"production",mail)).toThrow();
    expect(()=>validateFrozenMail(config,"test",{...mail,to:["buyer@example.com"]})).toThrow();
  });
});
describe("OPS-05 Resend adapter",()=>{
  it("sends the frozen payload with the stable key",async()=>{
    const fetcher=vi.fn().mockResolvedValue(Response.json({id:"accepted"}));
    expect(await sendResendEmail("secret",mail,"key",fetcher)).toBe("accepted");
    expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails",expect.objectContaining({body:JSON.stringify(mail),headers:expect.objectContaining({"Idempotency-Key":"key"}),redirect:"error"}));
  });
  it.each([429,500,503,408,409])("retries %s without exposing provider body",async status=>{
    await expect(sendResendEmail("secret",mail,"key",vi.fn().mockResolvedValue(new Response("private",{status})))).rejects.toMatchObject({permanent:false,code:"MAIL_RETRY"});
  });
  it.each([400,401,403,422])("puts permanent %s errors in review",async status=>{
    await expect(sendResendEmail("secret",mail,"key",vi.fn().mockResolvedValue(new Response("private",{status})))).rejects.toMatchObject({permanent:true,code:"MAIL_REJECTED"});
  });
});
