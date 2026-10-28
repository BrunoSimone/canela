// @vitest-environment jsdom
import { afterEach,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkshopEditor } from './workshop-editor';
import { workshopDocument } from '../domain/workshop-document';
import { demoWorkshop } from '../infrastructure/demo-workshop';
import type { WorkshopSettings } from '../infrastructure/postgres/workshop-repository';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function settings(confirmed=false):Promise<WorkshopSettings>{const document=workshopDocument(await demoWorkshop());if(confirmed)for(const k of Object.keys(document.confirmations) as Array<keyof typeof document.confirmations>)document.confirmations[k]=true;return {document,version:0,publishedVersion:null,publishedAt:null,environment:'production'};}
it('allows saving an incomplete draft without enabling publication or silently confirming the workshop',async()=>{
 const initial=await settings(),network=vi.fn().mockResolvedValue(Response.json({...initial,version:1}));vi.stubGlobal('fetch',network);render(<WorkshopEditor initial={initial}/>);
 expect((screen.getByRole('button',{name:'Publicar configuración'}) as HTMLButtonElement).disabled).toBe(true);
 await userEvent.click(screen.getByRole('button',{name:'Guardar borrador'}));await screen.findByRole('status');
 expect(JSON.parse(network.mock.calls[0][1].body).action).toBe('save');expect(screen.getByText('Todavía no hay una configuración publicada')).toBeTruthy();
});
it('requires deliberate publication and invalidates the affected approval when editing',async()=>{
 const initial=await settings(true),network=vi.fn().mockResolvedValue(Response.json({...initial,version:1,publishedVersion:1}));vi.stubGlobal('fetch',network);render(<WorkshopEditor initial={initial}/>);
 const publish=screen.getByRole('button',{name:'Publicar configuración'}) as HTMLButtonElement;expect(publish.disabled).toBe(true);
 await userEvent.click(screen.getByRole('checkbox',{name:/Quiero usar estos datos/}));expect(publish.disabled).toBe(false);
 fireEvent.change(screen.getByLabelText('Días de fabricación desde el pago'),{target:{value:'8'}});
 expect((screen.getByRole('checkbox',{name:'Plazo y capacidad confirmados'}) as HTMLInputElement).checked).toBe(false);expect(publish.disabled).toBe(true);
 await userEvent.click(screen.getByRole('checkbox',{name:'Plazo y capacidad confirmados'}));await userEvent.click(screen.getByRole('checkbox',{name:/Quiero usar estos datos/}));await userEvent.click(publish);
 await waitFor(()=>expect(network).toHaveBeenCalledTimes(1));expect(JSON.parse(network.mock.calls[0][1].body)).toMatchObject({action:'publish',version:0,document:{productionDays:8}});
});
it('keeps edits after a version conflict instead of overwriting another editor',async()=>{
 const initial=await settings(),network=vi.fn().mockResolvedValue(Response.json({error:'Otra persona guardó cambios. Recargá.'},{status:409}));vi.stubGlobal('fetch',network);render(<WorkshopEditor initial={initial}/>);
 fireEvent.change(screen.getByLabelText('Días de fabricación desde el pago'),{target:{value:'9'}});await userEvent.click(screen.getByRole('button',{name:'Guardar borrador'}));await screen.findByRole('alert');expect((screen.getByLabelText('Días de fabricación desde el pago') as HTMLInputElement).value).toBe('9');
});
