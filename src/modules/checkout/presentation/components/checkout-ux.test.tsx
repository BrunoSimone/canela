// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createAppStore } from "@/store/store";
import { hydrateCart } from "@/modules/cart/presentation/state/cart-slice";
import { CheckoutConfirmation } from "./checkout-confirmation";
import { CheckoutResultView } from "./checkout-result";
const mocks=vi.hoisted(()=>({quote:vi.fn(),start:vi.fn(),refresh:vi.fn(),replace:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh,replace:mocks.replace})}));
vi.mock("@/modules/checkout/presentation/client/checkout-api",async importOriginal=>({
  ...await importOriginal<object>(),
  useQuoteShippingMutation:()=>[mocks.quote,{isLoading:false}],
  useStartCheckoutMutation:()=>[mocks.start,{isLoading:false}],
}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

const nextButton = () => screen.getByRole("button", {name:"Continuar"}) as HTMLButtonElement;
const payButton = () => screen.getByRole("button", {name:"Continuar a Mercado Pago"}) as HTMLButtonElement;
async function fillContact(user: ReturnType<typeof userEvent.setup>, courier = false) {
  await user.type(screen.getByRole("textbox", {name:"Nombre y apellido"}), "Ana Pérez");
  await user.type(screen.getByRole("textbox", {name:"Email para el pedido"}), "ana@example.com");
  await user.type(screen.getByRole("textbox", {name:"Calle"}), "San Martín");
  await user.type(screen.getByRole("textbox", {name:"Altura"}), "123");
  if (courier) {
    await user.type(screen.getByRole("textbox", {name:/Teléfono de contacto/}), "2234567890");
    await user.type(screen.getByRole("textbox", {name:/Documento de quien recibe/}), "12345678");
  }
}
async function fillDestination(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", {name:"Localidad"}), "Mar del Plata");
  await user.selectOptions(screen.getByRole("combobox", {name:"Provincia"}), "B");
  await user.type(screen.getByRole("textbox", {name:"Código postal"}), "7600");
}
function renderControlled(expires = Date.now()+600000) {
  const store=createAppStore();
  store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true}]));
  render(<Provider store={store}><CheckoutConfirmation environment="test" shipping={{kind:"controlled_test",shippingCents:125000,shippingQuoteToken:"controlled",quoteExpiresAt:new Date(expires).toISOString()}} /></Provider>);
  return store;
}

function rates() {
  return {items:[{productId:"a",quantity:1,unitPriceCents:10000}],options:[
    {quoteToken:"expensive",carrierName:"Correo",serviceName:"Domicilio",parcelCount:1,shippingCents:200000,expiresAt:new Date(Date.now()+600000).toISOString()},
    {quoteToken:"cheap",carrierName:"OCA",serviceName:"Domicilio",parcelCount:1,shippingCents:120000,expiresAt:new Date(Date.now()+600000).toISOString()},
  ]};
}
function renderCourier(environment:"test"|"production"="production") {
  const store=createAppStore();
  store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true}]));
  render(<Provider store={store}><CheckoutConfirmation environment={environment} shipping={{kind:"zipnova"}} /></Provider>);
  return store;
}

describe("UX-03 checkout truthfulness and recovery",()=>{
  it("shows only the form until valid details are continued, without starting payment", async () => {
    renderControlled();
    const user=userEvent.setup();
    expect(nextButton().disabled).toBe(true);
    expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
    expect(screen.queryByRole("button",{name:"Continuar a Mercado Pago"})).toBeNull();
    expect(screen.queryByText("Cuenco")).toBeNull();
    fireEvent.submit(nextButton().closest("form")!);
    expect(mocks.quote).not.toHaveBeenCalled();
    await fillDestination(user);
    expect(nextButton().disabled).toBe(true);
    await fillContact(user);
    expect(nextButton().disabled).toBe(false);
    await user.click(nextButton());
    expect(screen.getByRole("heading",{name:"Resumen"})).toBeTruthy();
    expect(screen.queryByRole("textbox",{name:"Nombre y apellido"})).toBeNull();
    expect(payButton().disabled).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Revisá tu pedido"}));
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("validates all fields and another recipient before continuing, then submits normalized data", async () => {
    renderControlled(); const user=userEvent.setup();
    await fillContact(user); await fillDestination(user);
    for(const [name,bad,good] of [
      ["Email para el pedido","ana@local","ana@example.com"],
      ["Email para el pedido","ana@-invalid.com","ana@example.com"],
      ["Teléfono de contacto","abc","2234567890"],
      ["Altura","!!!","123"], ["Nombre y apellido","  ","Ana Pérez"],
    ]) {
      const input=screen.getByRole("textbox",{name:new RegExp(name)});
      await user.clear(input); await user.type(input,bad); await user.tab();
      expect(nextButton().disabled).toBe(true);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      fireEvent.submit(nextButton().closest("form")!);
      expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
      await user.clear(input); await user.type(input,good);
      expect(nextButton().disabled).toBe(false);
    }
    await user.click(screen.getByRole("checkbox",{name:"Recibe otra persona"}));
    expect(nextButton().disabled).toBe(true);
    await user.type(screen.getByRole("textbox",{name:"Nombre de quien recibe"}),"Luis Pérez");
    // Enter continues to the summary; it must never invoke the payment API.
    await user.keyboard("{Enter}");
    expect(mocks.start).not.toHaveBeenCalled();
    mocks.start.mockReturnValue({unwrap:async()=>({orderToken:"order",code:"PAYMENT_PROVIDER_UNCERTAIN"})});
    await user.click(payButton());
    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({buyerEmail:"ana@example.com",delivery:expect.objectContaining({recipientName:"Luis Pérez",postalCode:"7600"}),shippingQuoteToken:"controlled"}));
    expect(mocks.replace).toHaveBeenCalledWith("/checkout/resultado/order");
  });
  it("lets buyers edit without losing data and invalidates the summary when the cart changes", async () => {
    const store=renderControlled(); const user=userEvent.setup();
    await fillContact(user); await fillDestination(user); await user.click(nextButton());
    await user.click(screen.getByRole("button",{name:"Editar datos"}));
    expect((screen.getByRole("textbox",{name:"Localidad"}) as HTMLInputElement).value).toBe("Mar del Plata");
    expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    await user.type(screen.getByRole("textbox",{name:"Localidad"})," Centro");
    await user.click(nextButton());
    expect(payButton().disabled).toBe(false);
    act(()=>store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:2,checkoutEligible:true}])));
    expect(screen.queryByRole("button",{name:"Continuar a Mercado Pago"})).toBeNull();
    expect(screen.getByText(/Tu carrito cambió/)).toBeTruthy();
    await user.click(nextButton());
    expect(screen.getByText("2 unidades")).toBeTruthy();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("expires the rate without charging or silently changing the total", async () => {
    vi.useFakeTimers();
    try {
      renderControlled(Date.now()+2000);
      for(const [name,value] of [["buyerName","Ana Pérez"],["email","ana@example.com"],["streetName","San Martín"],["streetNumber","123"],["city","Mar del Plata"],["provinceCode","B"],["postalCode","7600"]]) {
        fireEvent.change(document.querySelector(`[name="${name}"]`)!,{target:{value}});
      }
      fireEvent.click(nextButton());
      expect(payButton().disabled).toBe(false);
      act(()=>vi.advanceTimersByTime(3000));
      expect(payButton().disabled).toBe(true);
      expect(screen.getByText("Pendiente de envío")).toBeTruthy();
      fireEvent.submit(payButton().closest("form")!);
      expect(mocks.start).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button",{name:"Volver a mis datos"}));
      expect(nextButton()).toBeTruthy();
      expect(mocks.refresh).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
  it("requires courier contact fields, chooses the cheapest rate and updates the displayed total on selection", async () => {
    renderCourier(); const user=userEvent.setup();
    await fillContact(user); await fillDestination(user);
    expect(nextButton().disabled).toBe(true);
    await user.type(screen.getByRole("textbox",{name:"Teléfono de contacto"}),"2234567890");
    expect(nextButton().disabled).toBe(true);
    const document=screen.getByRole("textbox",{name:"Documento de quien recibe"});
    await user.type(document,"12.345.678"); await user.tab();
    expect(nextButton().disabled).toBe(true);
    await user.clear(document); await user.type(document,"12345678");
    mocks.quote.mockReturnValue({unwrap:async()=>rates()});
    await user.click(nextButton());
    expect((screen.getByRole("radio",{name:/OCA/}) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("$1.300")).toBeTruthy();
    await user.click(screen.getByRole("radio",{name:/Correo/}));
    expect(screen.getByText("$2.100")).toBeTruthy();
    expect(payButton().disabled).toBe(false);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("keeps the form and allows a retry after an unavailable provider or no coverage", async () => {
    renderCourier(); const user=userEvent.setup();
    await fillContact(user,true); await fillDestination(user);
    mocks.quote.mockReturnValueOnce({unwrap:async()=>{throw {data:{code:"SHIPPING_PROVIDER_UNAVAILABLE"}};}})
      .mockReturnValueOnce({unwrap:async()=>({...rates(),options:[]})})
      .mockReturnValueOnce({unwrap:async()=>rates()});
    await user.click(nextButton());
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
    await user.click(nextButton());
    expect(await screen.findByText(/No encontramos un envío/)).toBeTruthy();
    await user.click(nextButton());
    expect(payButton().disabled).toBe(false);
    expect(mocks.quote).toHaveBeenCalledTimes(3);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("prevents double continues and never shows a late response for a changed cart", async () => {
    const store=renderCourier(); const user=userEvent.setup();
    await fillContact(user,true); await fillDestination(user);
    let resolve!: (value:ReturnType<typeof rates>)=>void;
    mocks.quote.mockReturnValue({unwrap:()=>new Promise(r=>{resolve=r;})});
    const form=nextButton().closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mocks.quote).toHaveBeenCalledOnce();
    expect((screen.getByRole("button",{name:"Preparando tu resumen…"}) as HTMLButtonElement).disabled).toBe(true);
    act(()=>store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:2,checkoutEligible:true}])));
    await act(async()=>resolve(rates()));
    expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
    expect(nextButton().disabled).toBe(false);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("returns to the data after a provider rate change and requires a new confirmation", async () => {
    renderCourier(); const user=userEvent.setup();
    await fillContact(user,true); await fillDestination(user);
    mocks.quote.mockReturnValue({unwrap:async()=>rates()});
    await user.click(nextButton());
    mocks.start.mockReturnValue({unwrap:async()=>{throw {data:{code:"SHIPPING_RATE_CHANGED"}};}});
    await user.click(payButton());
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(nextButton().disabled).toBe(false);
    expect(screen.queryByRole("heading",{name:"Resumen"})).toBeNull();
    await user.click(nextButton());
    expect(mocks.quote).toHaveBeenCalledTimes(2);
    expect(mocks.start).toHaveBeenCalledOnce();
  });
  it.each(["test","production"] as const)("labels the %s payment environment in the summary",async environment=>{
    renderCourier(environment); const user=userEvent.setup();
    await fillContact(user,true); await fillDestination(user);
    mocks.quote.mockReturnValue({unwrap:async()=>rates()});
    await user.click(nextButton());
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
