import { describe, it, expect } from "vitest";
import { verifiedPaymentOrderState } from "./verify-payment-order";
import type { PaymentOrder } from "../domain/payment-order";
const order = {providerOrderId:"mp-1", externalReference:"order-1", totalCents:1200, currency:"ARS", sellerUserId:"seller", applicationId:"app", state:"approved"} as PaymentOrder;
const target = {orderId:"order-1", providerOrderId:"mp-1", totalCents:1200, currency:"ARS" as const};
describe("OPS-08: persisted payment environment",()=>{
 it.each(["test","production"] as const)("accepts a matching %s order", environment=>{
  expect(verifiedPaymentOrderState(order,{...target,environment},{sellerUserId:"seller",applicationId:"app",environment})).toBe("approved");
 });
 it.each([["test","production"],["production","test"]] as const)("isolates %s orders from %s credentials",(stored,configured)=>{
  expect(verifiedPaymentOrderState(order,{...target,environment:stored},{sellerUserId:"seller",applicationId:"app",environment:configured})).toBe("review_required");
 });
 it("treats historical orders as test",()=>{
  expect(verifiedPaymentOrderState(order,target,{sellerUserId:"seller",applicationId:"app",environment:"production"})).toBe("review_required");
 });
});
