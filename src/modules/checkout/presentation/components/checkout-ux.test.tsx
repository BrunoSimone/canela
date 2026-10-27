// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createAppStore } from "@/store/store";
import { hydrateCart } from "@/modules/cart/presentation/state/cart-slice";
import { CheckoutConfirmation } from "./checkout-confirmation";
import { CheckoutResultView } from "./checkout-result";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn(),replace:vi.fn()})}));
const mocks=vi.hoisted(()=>({quote:vi.fn(),start:vi.fn()}));
vi.mock("@/modules/checkout/presentation/client/checkout-api",async importOriginal=>({
  ...await importOriginal<object>(),
  useQuoteShippingMutation:()=>[mocks.quote,{isLoading:false}],
  useStartCheckoutMutation:()=>[mocks.start,{isLoading:false}],
}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("UX-03 checkout truthfulness and recovery",()=>{
  it("requires a new quote after destination or cart changes",async()=>{
    const store=createAppStore();
    const item={id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true};
    store.dispatch(hydrateCart([item]));
    mocks.quote.mockReturnValue({unwrap:async()=>({items:[{productId:"a",quantity:1,unitPriceCents:10000}],options:[{quoteToken:"signed-rate",carrierName:"OCA",serviceName:"Domicilio",parcelCount:1,shippingCents:1200000,expiresAt:new Date(Date.now()+600000).toISOString()}]})});
    render(<Provider store={store}><CheckoutConfirmation environment="test" shipping={{kind:"zipnova"}} /></Provider>);
    const user=userEvent.setup();
    await user.click(screen.getByRole("button",{name:"Calcular envío"}));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(mocks.quote).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox",{name:"Localidad"}),"La Plata");
    await user.selectOptions(screen.getByRole("combobox",{name:"Provincia"}),"B");
    await user.type(screen.getByRole("textbox",{name:"Código postal"}),"1900");
    await user.click(screen.getByRole("button",{name:"Calcular envío"}));
    await user.click(await screen.findByRole("radio",{name:/OCA/}));
    expect((screen.getByRole("button",{name:"Continuar a Mercado Pago"}) as HTMLButtonElement).disabled).toBe(false);
    await user.type(screen.getByRole("textbox",{name:"Localidad"})," Centro");
    expect(screen.queryByRole("radio")).toBeNull();
    expect((screen.getByRole("button",{name:"Continuar a Mercado Pago"}) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button",{name:"Calcular envío"}));
    await user.click(await screen.findByRole("radio",{name:/OCA/}));
    act(()=>store.dispatch(hydrateCart([{...item,qty:2}])));
    expect(screen.queryByRole("radio")).toBeNull();
    expect((screen.getByRole("button",{name:"Continuar a Mercado Pago"}) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each(["test","production"] as const)("labels the %s payment environment accurately",environment=>{
    const store=createAppStore();
    store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true}]));
    render(<Provider store={store}><CheckoutConfirmation environment={environment} shipping={{kind:"zipnova"}} /></Provider>);
    expect(!!screen.queryByText(/Pago de prueba/)).toBe(environment==="test");
    if(environment==="production")expect(screen.getByText(/Pago seguro con Mercado Pago/)).toBeTruthy();
  });
  it("offers a read-only retry on a network failure without suggesting another payment",async()=>{
    const retry=vi.fn();
    render(<CheckoutResultView isLoading={false} isFetching={false} isError error={{status:"FETCH_ERROR"}} pollingEnabled={false} onRetry={retry} />);
    expect(screen.getByText("No pudimos consultar tu pedido")).toBeTruthy();
    expect(screen.queryByText("No encontramos el pedido")).toBeNull();
    expect(screen.queryByText("Intentar el pago nuevamente")).toBeNull();
    await userEvent.click(screen.getByRole("button",{name:"Volver a consultar"}));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("distinguishes an invalid order link from a temporary failure",()=>{
    render(<CheckoutResultView isLoading={false} isFetching={false} isError error={{status:404}} pollingEnabled={false} onRetry={()=>{}} />);
    expect(screen.getByText("No encontramos el pedido")).toBeTruthy();
  });
});
