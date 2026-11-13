import { expect,it } from 'vitest';
import { demoDesignCatalog } from '../../src/modules/customization/infrastructure/demo-catalog';
import { storefrontColorId } from '../../src/modules/customization/infrastructure/storefront-palette';
import materials from '../../src/modules/customization/infrastructure/murvi-palette.json';
import { dimensions,renderMosaic,validateDesign,validateWorkshop } from '../../src/modules/customization/domain/design';
import { raster } from '../../src/modules/customization/testing/workshop';
import { ADDITIONS,UNAVAILABLE,PREVIOUS_EXCLUSIONS,availableConfig,availableMaterials,generateAvailability,studyCrop } from './available-palette-study';

it('selects the exact 29 sourced colors, preserving earlier exclusions and original catalog',async()=>{
  const base=await demoDesignCatalog.configuration(),saved=structuredClone(base),config=availableConfig(base);
  validateWorkshop(config);
  expect(config.palette).toHaveLength(29);expect(base.palette).toHaveLength(36);
  const excluded=new Set<string>([...UNAVAILABLE,...PREVIOUS_EXCLUSIONS]);
  expect(availableMaterials.filter(c=>c.line==='Clasico')).toHaveLength(27);
  expect(availableMaterials.filter(c=>c.line!=='Clasico').map(c=>c.id)).toEqual([...ADDITIONS]);
  expect(config.palette.map(c=>c.id)).toEqual(materials.colors.filter(c=>(c.line==='Clasico'&&!excluded.has(c.id))||ADDITIONS.some(id=>id===c.id)).map(c=>storefrontColorId(c.id)));
  config.palette[0].hex='#000000';expect(base).toEqual(saved);
  expect((await demoDesignCatalog.configuration())).toEqual(saved);
});
it.each(ADDITIONS)('uses the sourced sample of %s exactly',async id=>{
  const color=materials.colors.find(c=>c.id===id)!,base=await demoDesignCatalog.configuration();
  expect(new Set(renderMosaic(raster(4,4,[...color.rgb,255]),availableConfig(base),30).cells)).toEqual(new Set([storefrontColorId(id)]));
});
it('generates all four labeled sizes with bounded cells and immutable source/baseline',async()=>{
  const base=await demoDesignCatalog.configuration(),original=structuredClone(base),source=raster(32,32),pixels=[...source.data];
  const result=generateAvailability(source,base);
  expect(result.map(v=>v.size)).toEqual([30,45,60,90]);
  expect(result.map(v=>v.after.cells.length)).toEqual([900,2025,3600,8100]);
  expect(result.map(v=>dimensions(v.after.config,v.size).framedMm)).toEqual([379,559,739,1099]);
  for(const v of result){validateDesign(v.before);validateDesign(v.after);expect(v.after.config.palette).toHaveLength(29);expect(v.before.config.palette).toHaveLength(36);expect(v.after.cells.some(id=>[...UNAVAILABLE,...PREVIOUS_EXCLUSIONS].map(storefrontColorId).includes(id))).toBe(false);}
  result[0].after.cells[0]='changed';result[0].after.config.palette[0].hex='#000000';
  expect(result[1].after.cells).not.toContain('changed');expect(result[1].after.config.palette[0].hex).toBe(original.palette[0].hex);
  expect(base).toEqual(original);expect([...source.data]).toEqual(pixels);
  expect(()=>renderMosaic(source,availableConfig(base),91)).toThrow();
});
it('applies the same bounded source framing to both palettes and every grid',async()=>{
  const source=raster(40,60),base=await demoDesignCatalog.configuration();
  expect(studyCrop(source)).toEqual({x:0,y:10,width:40,height:40});
  const crop=studyCrop(source,{zoom:2.5,x:0.5,y:1});
  expect(crop).toEqual({x:12,y:44,width:16,height:16});
  const outputs=generateAvailability(source,base,()=>0,crop);
  for(const output of outputs){
    expect(output.before).toEqual(renderMosaic(source,base,output.size,crop));
    expect(output.after).toEqual(renderMosaic(source,availableConfig(base),output.size,crop));
  }
  for(const framing of [{zoom:0,x:0,y:0},{zoom:3.1,x:0,y:0},{zoom:2,x:-0.1,y:1},{zoom:2,x:0.5,y:1.1},{zoom:NaN,x:0,y:0}])expect(()=>studyCrop(source,framing)).toThrow();
});
