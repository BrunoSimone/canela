// @vitest-environment jsdom
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {demoOrderById} from '../infrastructure/demo-orders';
import type {AdminOrder} from '../domain/order';
import {FrameProductionPanel} from './frame-production';
import {renderMosaic} from '@/modules/customization/domain/design';
import {testWorkshop,raster} from '@/modules/customization/testing/workshop';
import {installEditorDom} from '@/modules/customization/testing/editor-dom';
const initial:AdminOrder={...demoOrderById('11111111-1111-4111-8111-111111111111')!,source:'database',status:'prepare',frame:{state:'queued',version:2,productionDays:15,galleryConsent:false,galleryDraftCreated:false,design:renderMosaic(raster(),testWorkshop,3)}};
function Harness(){const [order,setOrder]=useState(initial);return <FrameProductionPanel order={order} onChanged={setOrder}/>;}
beforeEach(installEditorDom);afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const firstCell=()=>screen.getByRole('img',{name:'Cuadro en edición'}).querySelector('[data-cell]')!.getAttribute('fill');
async function paint(){await userEvent.click(screen.getByRole('button',{name:'Retocar venecitas'}));fireEvent.keyDown(screen.getByRole('group',{name:'Mosaico editable'}),{key:'Home'});await userEvent.click(screen.getByRole('button',{name:'Usar color Blanco'}));}
it('privately paints, undoes/redoes, saves cells with optimistic version and shows the manufacturing design',async()=>{
 const cells=[...initial.frame!.design!.cells];cells[0]='white';
 const fetcher=vi.fn().mockResolvedValue(Response.json({...initial,frame:{...initial.frame,version:3,productionDesign:{...initial.frame!.design,cells}}}));vi.stubGlobal('fetch',fetcher);render(<Harness/>);
 await paint();expect(firstCell()).toBe('#ffffff');await userEvent.click(screen.getByRole('button',{name:'Deshacer retoque'}));expect(firstCell()).toBe('#ff0000');await userEvent.click(screen.getByRole('button',{name:'Rehacer retoque'}));
 await userEvent.click(screen.getByRole('button',{name:'Guardar retoques'}));await screen.findByText(/Retoques guardados/);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({action:'retouch',version:2,cells});
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('img',{name:'Diseño de fabricación'})).toBeTruthy();expect(initial.frame!.design!.cells[0]).toBe('red');
});
it('keeps edits on a conflict and cancels without a second write',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({error:'El pedido cambió. Actualizá la ficha.'},{status:409}));vi.stubGlobal('fetch',fetcher);render(<Harness/>);await paint();
 await userEvent.click(screen.getByRole('button',{name:'Guardar retoques'}));await screen.findByRole('alert');expect(firstCell()).toBe('#ffffff');
 await userEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(screen.queryByRole('dialog')).toBeNull();expect(fetcher).toHaveBeenCalledOnce();
});
