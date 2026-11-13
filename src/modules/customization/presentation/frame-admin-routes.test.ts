import { describe,it,expect,vi,beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),get:vi.fn(),advance:vi.fn(),retouch:vi.fn(),prepare:vi.fn(),recover:vi.fn(),db:vi.fn()}));
vi.mock('@/db/client',()=>({getDatabase:mocks.db}));
vi.mock('@/modules/admin/infrastructure/admin-request',()=>({currentAdminSession:mocks.session,privateJson:(b:unknown,s=200)=>Response.json(b,{status:s,headers:{'Cache-Control':'private, no-store'}})}));
vi.mock('@/modules/customization/infrastructure/postgres/production',()=>({FrameProduction:class{get=mocks.get;advance=mocks.advance;retouch=mocks.retouch;}}));
vi.mock('@/modules/customization/infrastructure/gallery-publisher',()=>({createGalleryPublisher:()=>({prepare:mocks.prepare})}));
vi.mock('@/modules/customization/infrastructure/recover-frame-payment',()=>({recoverFramePayment:mocks.recover}));
vi.mock('@/modules/admin/infrastructure/postgres-order-reader',()=>({PostgresAdminOrderReader:class{get=async()=>({});}}));
import { GET } from '@/app/api/admin/orders/[id]/frame/guide/route';
import { POST } from '@/app/api/admin/orders/[id]/frame/route';
import { FrameCommerceError } from '../domain/workshop';
const context={params:Promise.resolve({id:'11111111-1111-4111-a111-111111111111'})};
const request=(body:unknown,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/admin/orders/id/frame',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({email:'owner@example.com'});mocks.get.mockResolvedValue(null);});
describe('private guide and production boundary',()=>{
 it('denies anonymous guide and state changes before looking up a design',async()=>{mocks.session.mockResolvedValue(null);expect((await GET(new Request('http://localhost/'),context)).status).toBe(401);expect((await POST(request({state:'making',version:1}),context)).status).toBe(401);expect(mocks.db).not.toHaveBeenCalled();});
 it('does not expose a guide for unpaid or unknown orders',async()=>{const r=await GET(new Request('http://localhost/'),context);expect(r.status).toBe(404);expect(r.headers.get('Cache-Control')).toContain('no-store');});
 it('rejects cross-origin fabrication and malformed transitions',async()=>{expect((await POST(request({state:'ready',version:2},'https://evil.example'),context)).status).toBe(403);expect((await POST(request({state:'queued',version:2}),context)).status).toBe(422);expect(mocks.advance).not.toHaveBeenCalled();});
 it('passes the version and actor and reports a stale edit without fabricating twice',async()=>{mocks.advance.mockRejectedValueOnce(new FrameCommerceError('PRODUCTION_CONFLICT','Actualizá la ficha.'));const r=await POST(request({state:'making',version:1}),context);expect(r.status).toBe(409);expect(mocks.advance).toHaveBeenCalledWith('11111111-1111-4111-a111-111111111111',1,'making','owner@example.com');});
});

it('PER-157 authenticates retouch writes, uses server actor/version and bounds the matrix body',async()=>{
 mocks.session.mockResolvedValueOnce(null);expect((await POST(request({action:'retouch',version:1,cells:[]}),context)).status).toBe(401);
 expect(mocks.retouch).not.toHaveBeenCalled();
 expect((await POST(request({action:'retouch',version:1,cells:[]},'https://evil.example'),context)).status).toBe(403);
 expect((await POST(request({action:'retouch',version:1,cells:['x'.repeat(100001)]}),context)).status).toBe(413);
 expect((await POST(request({action:'retouch',version:2,cells:['black'],actor:'forged'}),context)).status).toBe(200);
 expect(mocks.retouch).toHaveBeenCalledWith('11111111-1111-4111-a111-111111111111',2,['black'],'owner@example.com');
 mocks.retouch.mockRejectedValueOnce(new FrameCommerceError('PRODUCTION_CONFLICT','Actualizá.'));
 expect((await POST(request({action:'retouch',version:1,cells:['black']}),context)).status).toBe(409);
});
