// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("UX-03 checkout truthfulness and recovery",()=>{
  it("requires a new quote after destination or cart changes",async()=>{
    const store=createAppStore();
    const item={id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true};
    store.dispatch(hydrateCart([item]));
    mocks.quote.mockReturnValue({unwrap:async()=>({items:[{productId:"a",quantity:1,unitPriceCents:10000}],options:[{quoteToken:"signed-rate",carrierName:"OCA",serviceName:"Domicilio",parcelCount:1,shippingCents:1200000,expiresAt:new Date(Date.now()+600000).toISOString()}]})});
    render(<Provider store={store}><CheckoutConfirmation environment="test" shipping={{kind:"zipnova"}} /></Provider>);
    const user=userEvent.setup();
    await user.click(screen.getByRole("button",{name:"Calcular envío"}));
    expect((screen.getByRole("button",{name:"Calcular envío"}) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.quote).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox",{name:"Localidad"}),"La Plata");
    await user.selectOptions(screen.getByRole("combobox",{name:"Provincia"}),"B");
    await user.type(screen.getByRole("textbox",{name:"Código postal"}),"1900");
    await user.click(screen.getByRole("button",{name:"Calcular envío"}));
    await user.click(await screen.findByRole("radio",{name:/OCA/}));
    expect(payButton().disabled).toBe(true);
    await fillContact(user, true);
    expect(payButton().disabled).toBe(false);
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
  it("puts contact and shipping before the order summary and only prices a calculated destination", async () => {
    renderControlled();
    const user=userEvent.setup();
    const contact=screen.getByRole("group", {name:"Contacto y entrega"});
    const summary=screen.getByRole("heading", {name:"Resumen"});
    expect(contact.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("A calcular")).toBeTruthy();
    expect(screen.getByText("Pendiente de envío")).toBeTruthy();
    expect(payButton().disabled).toBe(true);
    fireEvent.submit(payButton().closest("form")!);
    expect(mocks.start).not.toHaveBeenCalled();
    await fillDestination(user);
    expect(screen.getByText("A calcular")).toBeTruthy();
    await user.click(screen.getByRole("button", {name:"Calcular envío"}));
    expect(screen.queryByText("A calcular")).toBeNull();
    expect(payButton().disabled).toBe(true);
    await fillContact(user);
    expect(payButton().disabled).toBe(false);
    await user.type(screen.getByRole("textbox", {name:"Localidad"}), " Centro");
    expect(screen.getByText("A calcular")).toBeTruthy();
    expect(payButton().disabled).toBe(true);
  });
  it("blocks invalid contact details and another recipient, then submits the valid normalized data", async () => {
    renderControlled();
    const user=userEvent.setup();
    await fillContact(user);
    await fillDestination(user);
    await user.click(screen.getByRole("button", {name:"Calcular envío"}));
    for(const [name,bad,good] of [
      ["Email para el pedido","ana@local","ana@example.com"],
      ["Email para el pedido","ana@-invalid.com","ana@example.com"],
      ["Teléfono de contacto","abc","2234567890"],
      ["Altura","!!!","123"],
      ["Nombre y apellido","  ","Ana Pérez"],
    ]) {
      const input=screen.getByRole("textbox", {name:new RegExp(name)});
      await user.clear(input); await user.type(input,bad); await user.tab();
      expect(payButton().disabled).toBe(true);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      fireEvent.submit(payButton().closest("form")!);
      expect(mocks.start).not.toHaveBeenCalled();
      await user.clear(input); await user.type(input,good);
      expect(payButton().disabled).toBe(false);
    }
    await user.click(screen.getByRole("checkbox", {name:"Recibe otra persona"}));
    expect(payButton().disabled).toBe(true);
    await user.click(screen.getByRole("textbox", {name:"Nombre de quien recibe"}));
    await user.tab();
    await user.click(screen.getByRole("checkbox", {name:"Recibe otra persona"}));
    expect(payButton().disabled).toBe(false);
    await user.click(screen.getByRole("checkbox", {name:"Recibe otra persona"}));
    await user.type(screen.getByRole("textbox", {name:"Nombre de quien recibe"}), "Luis Pérez");
    expect(payButton().disabled).toBe(false);
    mocks.start.mockReturnValue({unwrap:async()=>{throw {data:{code:"PAYMENT_PROVIDER_UNAVAILABLE"}};}});
    await user.click(payButton());
    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({buyerEmail:"ana@example.com",delivery:expect.objectContaining({recipientName:"Luis Pérez",postalCode:"7600"}),shippingQuoteToken:"controlled"}));
  });
  it("expires a selected quote and hides the obsolete total", async () => {
    vi.useFakeTimers();
    try {
      renderControlled(Date.now()+2000);
      for(const [name,value] of [["city","Mar del Plata"],["provinceCode","B"],["postalCode","7600"]]) {
        fireEvent.change(document.querySelector(`[name="${name}"]`)!, {target:{value}});
      }
      fireEvent.click(screen.getByRole("button", {name:"Calcular envío"}));
      expect(screen.queryByText("A calcular")).toBeNull();
      act(()=>vi.advanceTimersByTime(3000));
      expect(screen.getByText("A calcular")).toBeTruthy();
      expect(payButton().disabled).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it("requires the courier phone and document even with a selected rate", async () => {
    const store=createAppStore();
    store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:1,checkoutEligible:true}]));
    mocks.quote.mockReturnValue({unwrap:async()=>({items:[],options:[{quoteToken:"courier",carrierName:"OCA",serviceName:"Domicilio",parcelCount:1,shippingCents:120000,expiresAt:new Date(Date.now()+600000).toISOString()}]})});
    render(<Provider store={store}><CheckoutConfirmation environment="production" shipping={{kind:"zipnova"}} /></Provider>);
    const user=userEvent.setup();
    await fillContact(user);
    await fillDestination(user);
    await user.click(screen.getByRole("button", {name:"Calcular envío"}));
    await user.click(await screen.findByRole("radio", {name:/OCA/}));
    expect(payButton().disabled).toBe(true);
    await user.type(screen.getByRole("textbox", {name:"Teléfono de contacto"}), "2234567890");
    expect(payButton().disabled).toBe(true);
    const document=screen.getByRole("textbox", {name:"Documento de quien recibe"});
    await user.type(document,"12.345.678"); await user.tab();
    expect(document.getAttribute("aria-invalid")).toBe("true");
    expect(payButton().disabled).toBe(true);
    await user.clear(document); await user.type(document,"12345678");
    expect(payButton().disabled).toBe(false);
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
