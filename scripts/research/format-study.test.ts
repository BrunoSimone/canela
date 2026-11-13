import { expect,it } from 'vitest';
import { demoDesignCatalog } from '../../src/modules/customization/infrastructure/demo-catalog';
import { raster } from '../../src/modules/customization/testing/workshop';
import { dimensions } from '../../src/modules/customization/domain/design';
import { generateVariants,VARIANTS,variantCaption } from './format-study';

it('compares exactly the four requested grids, with explicit tile dimensions and independent snapshots',async()=>{
  const config=await demoDesignCatalog.configuration(),before=structuredClone(config);
  const source=raster(),pixels=[...source.data];
  const results=generateVariants(source,config);
  expect(results.map(v=>v.id)).toEqual(['2cm-30','2cm-45','11mm-45','11mm-90']);
  expect(results.map(v=>v.design.cells.length)).toEqual([900,2025,2025,8100]);
  expect(results.map(v=>v.design.config.tileMm)).toEqual([20,20,11,11]);
  expect(results.map(v=>v.design.config.palette.length)).toEqual([62,62,36,36]);
  expect(results.map(v=>dimensions(v.design.config,v.size).framedMm)).toEqual([649,964,559,1099]);
  expect(VARIANTS.map((v,i)=>variantCaption(v,results[i].design))).toEqual([
    'Venecita 2 × 2 cm · Grilla 30 × 30 · 64,9 cm con marco',
    'Venecita 2 × 2 cm · Grilla 45 × 45 · 96,4 cm con marco',
    'Venecita 1,1 × 1,1 cm · Grilla 45 × 45 · 55,9 cm con marco',
    'Venecita 1,1 × 1,1 cm · Grilla 90 × 90 · 109,9 cm con marco',
  ]);
  results[0].design.cells[0]='changed';results[2].design.config.palette[0].hex='#000000';
  expect(results[1].design.cells).not.toContain('changed');
  expect(results[3].design.config.palette[0].hex).toBe(before.palette[0].hex);
  expect(config).toEqual(before);expect([...source.data]).toEqual(pixels);
});
