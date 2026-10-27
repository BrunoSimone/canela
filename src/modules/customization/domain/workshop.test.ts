import { describe, it, expect } from 'vitest';
import { frameSandboxEnabled } from '../infrastructure/commerce-mode';
import { acceptedDesign, validateFrameWorkshop, workshopPending } from './workshop';
import { demoWorkshop } from '../infrastructure/demo-workshop';
import { selectDesign } from './purchase';
import { demoDesignCatalog } from '../infrastructure/demo-catalog';

describe('PER-146 workshop and commercial lock', () => {
  it('keeps real charges locked even with all general commerce flags', () => {
    const env = { CUADROS_CHECKOUT_MODE:'sandbox', PAYMENT_ENVIRONMENT:'test', CHECKOUT_MODE:'test', ZIPNOVA_ACCOUNT_MODE:'sandbox', SHIPPING_PROVIDER:'zipnova' };
    expect(frameSandboxEnabled(env)).toBe(true);
    for (const changes of [{VERCEL_ENV:'production'}, {PAYMENT_ENVIRONMENT:'production'}, {ZIPNOVA_ACCOUNT_MODE:'operational'}, {CHECKOUT_MODE:'production'}, {CUADROS_CHECKOUT_MODE:'production'}, {CUADROS_PREVIEW_ENABLED:'0'}])
      expect(frameSandboxEnabled({...env,...changes,COMMERCE_PRODUCTION_APPROVED:'1'})).toBe(false);
    expect(frameSandboxEnabled({})).toBe(false);
  });
  it('keeps workshop approvals pending and rejects inadequate packaging', async () => {
    const w = await demoWorkshop(); expect(workshopPending(w)).toContain('geometry');
    w.packages[0].widthCm=1; expect(()=>validateFrameWorkshop(w)).toThrow();
  });
  it('rebuilds accepted design with authoritative materials and rejects old or foreign cells', async () => {
    const w = await demoWorkshop(), design=(await demoDesignCatalog.templates())[0].design;
    const selected=selectDesign(design); const result=acceptedDesign(w,selected);
    expect(result.cells).toEqual(design.cells); result.cells[0]='tampered'; expect(design.cells[0]).not.toBe('tampered');
    expect(()=>acceptedDesign(w,{...selected,configurationVersion:'old'})).toThrow();
    expect(()=>acceptedDesign(w,{...selected,cells:['unknown']})).toThrow();
  });
});
