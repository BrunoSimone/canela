// @vitest-environment jsdom
import { afterEach,describe,it,expect,vi } from 'vitest';
import { cleanup,render,screen,waitFor } from '@testing-library/react';
import { FrameResult } from './frame-result';
import { demoDesignCatalog } from '../infrastructure/demo-catalog';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('persisted frame receipt',()=>{
 it('uses verified server status, displays the saved design, and never clears the stock cart',async()=>{
  localStorage.setItem('cart','stock purchase');const design=(await demoDesignCatalog.templates())[0].design;
  const network=vi.fn(async(url:string)=>url.endsWith('/reconcile')?Response.json({status:'paid'}):Response.json({status:'review_required',production:'awaiting_payment',environment:'test',design,frameCents:100,shippingCents:10,totalCents:110,productionDays:7}));vi.stubGlobal('fetch',network);
  render(<FrameResult publicToken={'a'.repeat(43)}/>);await screen.findByRole('heading',{name:'Necesitamos revisar tu pedido'});expect(screen.queryByRole('heading',{name:'Pago confirmado'})).toBeNull();expect(screen.getByRole('img',{name:'Diseño guardado con tu pedido'})).toBeTruthy();expect(localStorage.getItem('cart')).toBe('stock purchase');expect(screen.queryByRole('link',{name:'Retomar mi diseño'})).toBeNull();
 });
 it('lets a rejected purchase reopen its accepted design without starting another payment',async()=>{
  const design=(await demoDesignCatalog.templates())[0].design;
  const network=vi.fn(async()=>Response.json({status:'not_completed',production:'awaiting_payment',environment:'test',design,frameCents:100,shippingCents:10,totalCents:110,productionDays:7}));vi.stubGlobal('fetch',network);
  render(<FrameResult publicToken={'b'.repeat(43)}/>);
  expect((await screen.findByRole('link',{name:'Retomar mi diseño'})).getAttribute('href')).toBe(`/crear-cuadro?reintentar=${'b'.repeat(43)}`);
  expect(network).toHaveBeenCalledTimes(2);
 });
 it('offers retry on network failure without a new payment action',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('network')));render(<FrameResult publicToken={'a'.repeat(43)}/>);await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy());expect(screen.getByRole('button',{name:'Actualizar estado'})).toBeTruthy();expect(screen.queryByText('Pagar')).toBeNull();});
});
