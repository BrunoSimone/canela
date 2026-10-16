import {describe,it,expect} from "vitest";
import {parseDeliverySnapshot} from "./delivery";
import {testDelivery} from "./delivery.test-fixture";
import {buildStartCheckoutRequest} from "../presentation/client/checkout-api";
import {parseCheckoutRequest} from "../presentation/http/checkout-request";
describe("shipment recipient document",()=>{
  it("round-trips the document through the browser request and server parser",()=>{
    const delivery={...testDelivery,recipientDocument:"12345678"};
    const request=buildStartCheckoutRequest({items:[{productId:"piece",quantity:1}],buyerEmail:"buyer@example.com",delivery,shippingQuoteToken:"test",idempotencyKey:"test"});
    expect(parseCheckoutRequest(request.body,"test").delivery).toEqual(delivery);
  });
  it.each(["<script>","1234","123\n5678","12.345.678","x".repeat(21)])("rejects malformed document %s",recipientDocument=>{
    expect(()=>parseDeliverySnapshot({...testDelivery,recipientDocument})).toThrow();
  });
  it("keeps old controlled-checkout payloads unchanged",()=>expect(parseDeliverySnapshot(testDelivery)).toEqual(testDelivery));
});
