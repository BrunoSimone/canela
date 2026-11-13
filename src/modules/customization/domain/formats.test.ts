import {expect,it} from 'vitest';
import {FRAME_FORMATS,frameFormat,formatOf,adaptTemplate} from './formats';
import {dimensions,renderMosaic} from './design';
import {previewWorkshop} from '../infrastructure/format-options';
import {testWorkshop,raster} from '../testing/workshop';
import {storefrontColorId} from '../infrastructure/storefront-palette';
import {initialWorkshopDocument} from '../infrastructure/initial-workshop';
import {parseWorkshopDocument} from './workshop-document';
it('keeps both exact palettes, geometry, prices and packages isolated',async()=>{
 const [small,large]=await Promise.all(FRAME_FORMATS.map(previewWorkshop));
 expect(small.config.palette).toHaveLength(29);expect(large.config.palette).toHaveLength(36);
 expect(small.config).toMatchObject({tileMm:11,maxCells:90});expect(large.config).toMatchObject({tileMm:20,maxCells:45});
 expect(small.config.palette.some(c=>c.id===storefrontColorId('murvi-di100'))).toBe(true);
 expect(large.config.palette.some(c=>c.id===storefrontColorId('murvi-di100'))).toBe(false);
 for(const w of [small,large])for(const id of ['murvi-m-24','murvi-c-50'])expect(w.config.palette.some(c=>c.id===storefrontColorId(id))).toBe(false);
 expect(dimensions(small.config,45).framedMm).not.toBe(dimensions(large.config,45).framedMm);
 small.config.palette[0].hex='#000000';expect((await previewWorkshop('1x1')).config.palette[0].hex).not.toBe('#000000');
});
it('rejects arbitrary format selectors and adapts a template without changing its snapshot',()=>{
 expect(frameFormat(undefined)).toBe('1x1');expect(frameFormat('2x2')).toBe('2x2');
 for(const bad of [null,'3x3','__proto__',{},['1x1']])expect(()=>frameFormat(bad)).toThrow();
 const source=renderMosaic(raster(),testWorkshop,3),original=structuredClone(source),config={...testWorkshop,tileMm:20,palette:[testWorkshop.palette[1]]};
 config.backgroundColorId=config.palette[0].id;
 expect(adaptTemplate(source,config,5).cells).toEqual(Array(25).fill(config.palette[0].id));expect(source).toEqual(original);expect(formatOf(config)).toBe('2x2');
});
it('stores distinct private profiles with shared terms/capacity and separate public identities',async()=>{
 const doc=await initialWorkshopDocument();doc.productionDays=15;doc.capacity=5;
 const small=parseWorkshopDocument(doc),large=parseWorkshopDocument(doc,'2x2');
 expect(small.config.id).not.toBe(large.config.id);expect(small.config.version).not.toBe(large.config.version);
 expect(small.materials).not.toEqual(large.materials);expect(small.capacity).toBe(large.capacity);expect(small.terms).toEqual(large.terms);
 expect(()=>parseWorkshopDocument({...doc,largeFormat:undefined},'2x2')).toThrow();
});
