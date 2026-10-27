import { describe,it,expect } from 'vitest';
import { demoWorkshop } from './demo-workshop';
import { demoDesignCatalog } from './demo-catalog';
import { renderWorkshopGuide } from './workshop-guide';
import type { FrameSnapshot } from '../domain/frame-order';
import { resizeDesign } from '../domain/design';
describe('private production guide',()=>{
 it('prints every tile once, in frontal row/column order, even at the largest size',async()=>{const w=await demoWorkshop(),base=(await demoDesignCatalog.templates())[0].design;const design=resizeDesign(base,w.config,45);
 const snapshot:FrameSnapshot={design,materials:w.materials,priceCents:1,workshopFingerprint:'fixture',productionDays:7,capacity:5,terms:w.terms,acceptance:{at:'2026-10-27',gallery:false}};
 const html=renderWorkshopGuide('test-order',snapshot,true),cells=[...html.matchAll(/data-cell="(\d+),(\d+)"/g)].map(m=>`${m[1]},${m[2]}`);
 expect(cells).toHaveLength(2025);expect(new Set(cells).size).toBe(2025);expect(cells).toContain('44,44');expect(html).toContain('No fabricar ni despachar');expect(html).toContain('Vista de frente');expect(html).toContain(w.materials[design.cells[0]]);
 });
 it('escapes operator text and keeps a bought design independent of later configuration changes',async()=>{const w=await demoWorkshop(),design=(await demoDesignCatalog.templates())[0].design;const snapshot:FrameSnapshot={design,materials:Object.fromEntries(Object.keys(w.materials).map(k=>[k,'<script>bad</script>'])),priceCents:1,workshopFingerprint:'fixture',productionDays:7,capacity:5,terms:w.terms,acceptance:{at:'date',gallery:false}};
 const before=renderWorkshopGuide('order',snapshot,false);w.config.palette[0].name='CHANGED';expect(renderWorkshopGuide('order',snapshot,false)).toBe(before);expect(before).not.toContain('<script>');expect(before).toContain('&lt;script&gt;');
 });
});
