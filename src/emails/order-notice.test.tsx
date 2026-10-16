import { describe,it,expect } from "vitest";
import {renderOrderNotice, type OrderNoticeProps} from "./order-notice";
const props:OrderNoticeProps={kind:"owner_paid",reference:"ID TEST",test:true,actionUrl:"https://canela.test/admin/pedidos/test",carrier:"OCA",trackingNumber:null,totalCents:1512300,items:[{name:'<script>alert("x")</script> & pieza',quantity:2}]};
describe("OPS-04 templates",()=>{
 it("renders owner HTML and text with escaped catalog content and a panel link",async()=>{
  const mail=await renderOrderNotice(props);
  expect(mail.subject).toContain("[PRUEBA]");expect(mail.html).not.toContain('<script>alert');
  expect(mail.html).toContain('&lt;script&gt;');expect(mail.text).toContain("2 ×");
  expect(mail.text).toContain("15.123,00");expect(mail.text).toContain(props.actionUrl);
  expect(mail.text).toContain("simulación");
 });
 it.each([null,"TN-PRUEBA"])("renders tracking with optional number %s without a login token",async trackingNumber=>{
  const mail=await renderOrderNotice({...props,kind:"buyer_shipped",test:false,trackingNumber,actionUrl:"https://tracking.example.com/1"});
  expect(mail.subject).not.toContain("PRUEBA");expect(mail.text).toContain("OCA");expect(mail.text).toContain("https://tracking.example.com/1");
  expect(mail.text).not.toContain("simulación");expect(mail.text).not.toContain("token=");expect(mail.text).not.toContain("15.123");
  expect(mail.text.includes("Número de seguimiento:")).toBe(!!trackingNumber);
 });
});
