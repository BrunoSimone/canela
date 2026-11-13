// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Creator} from './creator';
import {publishPricing} from '../domain/public-pricing';
import {previewWorkshop} from '../infrastructure/format-options';
import {raster} from '../testing/workshop';
const load=vi.hoisted(()=>vi.fn());
vi.mock('./local-image',()=>({loadLocalImage:load}));
vi.mock('react-easy-crop',()=>({default:()=> <div>Recortador</div>}));
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
async function setup(){
 vi.stubGlobal('URL',{revokeObjectURL:vi.fn()});load.mockResolvedValue({url:'blob:local',raster:raster()});
 const small=await previewWorkshop('1x1'),large=await previewWorkshop('2x2');
 render(<Creator config={small.config} pricing={publishPricing(small.config,small.pricing)} template={null} templateUnavailable={false} formats={[{id:'1x1',config:small.config,pricing:publishPricing(small.config,small.pricing)},{id:'2x2',config:large.config,pricing:publishPricing(large.config,large.pricing)}]}/>);
}
it('never offers individual or global public palette editing before or after upload',async()=>{
 await setup();await userEvent.upload(screen.getByLabelText('Elegir imagen'),new File(['x'],'foto.png',{type:'image/png'}));
 expect(screen.queryByRole('button',{name:'Retocar venecitas'})).toBeNull();expect(screen.queryByText('Personalizar colores')).toBeNull();expect(screen.queryAllByRole('combobox')).toHaveLength(0);
 expect(screen.getByRole('img',{name:/Tu mosaico/})).toBeTruthy();expect(screen.getByRole('slider',{name:/Acercar imagen/})).toBeTruthy();
});
it('preserves the local image while format switches bound size and update dimensions and summary',async()=>{
 await setup();expect(screen.queryByLabelText('Precio estimado del cuadro')).toBeNull();
 await userEvent.upload(screen.getByLabelText('Elegir imagen'),new File(['x'],'foto.png',{type:'image/png'}));
 fireEvent.change(screen.getByRole('slider',{name:'Cantidad de venecitas por lado'}),{target:{value:'90'}});
 expect(screen.getByRole('img',{name:'Tu mosaico de 90 por 90 venecitas'})).toBeTruthy();
 await userEvent.click(screen.getByRole('radio',{name:/2×2/}));
 expect(screen.getByRole('img',{name:'Tu mosaico de 45 por 45 venecitas'})).toBeTruthy();
 expect(screen.getByRole('slider',{name:'Cantidad de venecitas por lado'}).getAttribute('max')).toBe('45');
 expect(load).toHaveBeenCalledOnce();
 await userEvent.click(screen.getByRole('button',{name:'Revisar mi cuadro'}));
 expect(screen.getByText(/Venecitas 2×2/)).toBeTruthy();
 await userEvent.click(screen.getByRole('button',{name:'Seguir editando'}));
 expect((screen.getByRole('radio',{name:/2×2/}) as HTMLInputElement).checked).toBe(true);
 await userEvent.click(screen.getByRole('radio',{name:/1×1/}));expect(screen.getByRole('slider',{name:'Cantidad de venecitas por lado'}).getAttribute('max')).toBe('90');
});
