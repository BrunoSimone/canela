// @vitest-environment jsdom
import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FrameSandboxPurchase } from './frame-sandbox-purchase';
import { demoWorkshop } from '../infrastructure/demo-workshop';
import { demoDesignCatalog } from '../infrastructure/demo-catalog';
import { estimateFrame } from '../domain/estimate';
const option={id:'quote',expiresAt:new Date(Date.now()+900_000).toISOString(),frameCents:10000,shippingCents:1000,totalCents:11000,carrier:'Correo',service:'Domicilio',productionDays:7};
const network=vi.fn(),navigate=vi.fn();
beforeEach(async()=>{network.mockReset();navigate.mockReset();vi.stubGlobal('fetch',network);const w=await demoWorkshop(),design=(await demoDesignCatalog.templates())[0].design;
 render(<FrameSandboxPurchase design={design} estimate={estimateFrame(w.config,design.size,w.pricing)} settings={{terms:w.terms,productionDays:7}} onEdit={vi.fn()} navigate={navigate}/>);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function shipping(){await userEvent.click(screen.getByRole('checkbox',{name:/Revisé el diseño/}));await userEvent.click(screen.getByRole('button',{name:'Continuar con el envío'}));
 const values={'Nombre y apellido':'Persona Test','Email':'persona@example.com','Teléfono':'2235551234','DNI o documento':'12345678','Calle':'Calle Test','Número':'100','Localidad':'Mar del Plata','Código postal (4 dígitos)':'7600'};
 for(const [name,value] of Object.entries(values))fireEvent.change(screen.getByLabelText(name),{target:{value}});
 fireEvent.change(screen.getByLabelText('Provincia'),{target:{value:'B'}});
 await userEvent.click(screen.getByRole('checkbox',{name:/Acepto estas condiciones/}));
}
async function quote(){await shipping();network.mockResolvedValueOnce(Response.json({mode:'sandbox',options:[option]}));await userEvent.click(screen.getByRole('button',{name:'Calcular envío'}));await screen.findByRole('heading',{name:'Revisá el total'});}
describe('sandbox purchase UI',()=>{
 it('requires acceptance, leaves gallery opt-in off, and sends only the selected design and delivery',async()=>{
  expect((screen.getByRole('button',{name:'Continuar con el envío'}) as HTMLButtonElement).disabled).toBe(true);await quote();
  const body=JSON.parse(network.mock.calls[0][1].body);expect(body.galleryConsent).toBe(false);expect(body.accepted).toBe(true);expect(body.termsVersion).toBe('preview-1');expect(body).not.toHaveProperty('priceCents');expect(body.design).not.toHaveProperty('config');expect(body).not.toHaveProperty('image');
  expect(screen.queryByText(/mano de obra|Murvi|material-/i)).toBeNull();expect(screen.queryByLabelText(/tarjeta|CVV/i)).toBeNull();
  network.mockResolvedValueOnce(Response.json({mode:'sandbox',checkoutUrl:'https://www.mercadopago.com.ar/checkout/test',resultUrl:'http://localhost/result'}));await userEvent.click(screen.getByRole('button',{name:'Ir a Mercado Pago de prueba'}));await waitFor(()=>expect(navigate).toHaveBeenCalledWith('https://www.mercadopago.com.ar/checkout/test'));
 });
 it('reuses the purchase attempt after a network failure and prevents changing its delivery',async()=>{
  await quote();network.mockRejectedValueOnce(Error('network'));await userEvent.click(screen.getByRole('button',{name:'Ir a Mercado Pago de prueba'}));await screen.findByRole('alert');
  const first=JSON.parse(network.mock.calls[1][1].body);expect((screen.getByRole('button',{name:'Volver al domicilio'}) as HTMLButtonElement).disabled).toBe(true);
  network.mockResolvedValueOnce(Response.json({mode:'sandbox',checkoutUrl:null,resultUrl:window.location.origin+'/cuadros/resultado/token',uncertain:true}));await userEvent.click(screen.getByRole('button',{name:'Reintentar esta compra'}));await waitFor(()=>expect(navigate).toHaveBeenCalled());
  expect(JSON.parse(network.mock.calls[2][1].body)).toEqual(first);
 });
 it('forces a new quote after a tariff change without keeping an old payable option',async()=>{
  await quote();network.mockResolvedValueOnce(Response.json({code:'RATE_CHANGED',error:'El envío cambió.'},{status:409}));await userEvent.click(screen.getByRole('button',{name:'Ir a Mercado Pago de prueba'}));await screen.findByRole('heading',{name:'Envío de tu cuadro'});
  expect(navigate).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Ir a Mercado Pago de prueba'})).toBeNull();expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('persona@example.com');
 });
});
