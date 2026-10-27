import { afterEach,describe,it,expect,vi } from 'vitest';
import { demoWorkshop } from './demo-workshop';
import { parseWorkshopDocument,type WorkshopDocument } from '../domain/workshop-document';
import { frameDesignCatalog,parseGalleryDocument,loadFrameWorkshop } from './sanity-workshop';
import { demoDesignCatalog } from './demo-catalog';
import { workshopPending } from '../domain/workshop';
afterEach(()=>vi.unstubAllEnvs());
async function document():Promise<WorkshopDocument>{const w=await demoWorkshop();return {_rev:'cms-version',geometry:w.config,colors:w.config.palette.map(c=>({publicId:c.id,name:c.name,hex:c.hex,material:w.materials[c.id],enabled:true})),pricing:{version:'cms',tilePackArs:w.pricing.tilePackCents/100,tilePackQuantity:w.pricing.tilePackQuantity,roundToArs:w.pricing.roundToCents/100,sizes:w.pricing.sizes.map(s=>({cells:s.cells,laborArs:s.laborCents/100,suppliesArs:s.suppliesCents/100}))},packages:w.packages,capacity:w.capacity,productionDays:w.productionDays,termsText:w.terms.text,confirmations:w.confirmations};}
describe('Sanity workshop boundaries',()=>{
 it('converts ARS to exact cents, preserves stable public colors, and keeps all confirmations pending',async()=>{const d=await document(),w=parseWorkshopDocument(d);expect(w.pricing.tilePackCents).toBe(1391750);expect(w.config.version).toBe('cms-version');expect(workshopPending(w)).toHaveLength(8);expect(JSON.stringify(w.config)).not.toContain('Murvi');expect(JSON.stringify(w.config)).not.toContain('material');});
 it('rejects duplicate colors, incomplete ranges, unknown backgrounds and invalid prices',async()=>{const d=await document();expect(()=>parseWorkshopDocument({...d,colors:[...d.colors,d.colors[0]]})).toThrow();expect(()=>parseWorkshopDocument({...d,packages:d.packages.slice(0,1)})).toThrow();expect(()=>parseWorkshopDocument({...d,geometry:{...d.geometry,backgroundColorId:'unknown'}})).toThrow();expect(()=>parseWorkshopDocument({...d,pricing:{...d.pricing,tilePackArs:0.001}})).toThrow();});
 it('does not silently fall back to fixtures on a misspelled catalog setting',async()=>{vi.stubEnv('CUADROS_CATALOG_SOURCE','santiy');expect(()=>frameDesignCatalog()).toThrow();await expect(loadFrameWorkshop()).rejects.toThrow();});
 it('strips unknown gallery/config/color fields and filters invalid designs',async()=>{const design=(await demoDesignCatalog.templates())[0].design;const input={_id:'public-design',title:'Atardecer',description:'Un mosaico.',designJson:JSON.stringify({...design,email:'private@example.com',config:{...design.config,materials:{private:'secret'},palette:design.config.palette.map(c=>({...c,material:'Murvi-private'}))}})};
 const parsed=parseGalleryDocument(input);expect(parsed?.design.cells).toEqual(design.cells);expect(JSON.stringify(parsed)).not.toMatch(/private|Murvi/);expect(parseGalleryDocument({...input,designJson:'{}'})).toBeNull();
 });
});
