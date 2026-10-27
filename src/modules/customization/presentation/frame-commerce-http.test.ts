import { describe,it,expect,vi } from 'vitest';
import { frameCommerceHandler } from './frame-commerce-http';
import type { FrameCommerce } from '../application/frame-commerce';
import { FrameCommerceError } from '../domain/workshop';
const request=(body:unknown,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/cuadros/compra',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
describe('persistent frame HTTP boundary',()=>{
 it('keeps all provider operations unreachable when disabled',async()=>{const service=vi.fn();const r=await frameCommerceHandler({enabled:()=>false,service})(request({action:'pay'}));expect(r.status).toBe(403);expect(service).not.toHaveBeenCalled();});
 it('rejects cross-origin requests and oversized bodies before service construction',async()=>{const service=vi.fn();const handler=frameCommerceHandler({enabled:()=>true,service});expect((await handler(request({},'https://attacker.example'))).status).toBe(403);expect((await handler(request({action:'quote',cells:'x'.repeat(200_000)}))).status).toBe(413);expect(service).not.toHaveBeenCalled();});
 it('only exposes the final frame price and the shipping option, without manufacturing costs or materials',async()=>{
  const quote=vi.fn().mockResolvedValue([{id:'quote',expiresAt:'date',snapshot:{priceCents:100,productionDays:7,materials:{secret:'Murvi-1'},terms:'private'},shipping:{amountCents:10,carrierName:'Correo',serviceName:'Domicilio',sellerAmountCents:3}}]);
  const r=await frameCommerceHandler({enabled:()=>true,service:()=>({quote}) as unknown as FrameCommerce})(request({action:'quote'}));
  expect(await r.json()).toEqual({mode:'sandbox',options:[{id:'quote',expiresAt:'date',frameCents:100,shippingCents:10,totalCents:110,carrier:'Correo',service:'Domicilio',productionDays:7}]});expect(r.headers.get('cache-control')).toContain('no-store');
 });
 it('returns an actionable capacity conflict instead of contacting a second payment gateway',async()=>{const pay=vi.fn().mockRejectedValue(new FrameCommerceError('CAPACITY_FULL','Sin cupo'));const r=await frameCommerceHandler({enabled:()=>true,service:()=>({pay}) as unknown as FrameCommerce})(request({action:'pay'}));expect(r.status).toBe(409);expect((await r.json()).code).toBe('CAPACITY_FULL');});
});
