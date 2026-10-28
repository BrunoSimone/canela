import { describe, expect, it } from 'vitest';
import { publishPricing, lookupFrameEstimate, publicEstimate } from './public-pricing';
import { estimateFrame } from './estimate';
import { demoWorkshop } from '../infrastructure/demo-workshop';

describe('PER-146: public pricing and private workshop', () => {
  it('quotes every allowed size identically without exposing workshop cost components', async () => {
    const w = await demoWorkshop(), pricing = publishPricing(w.config, w.pricing);
    for (let size = w.config.minCells; size <= w.config.maxCells; size += w.config.step) {
      expect(lookupFrameEstimate(w.config, size, pricing)).toEqual(publicEstimate(estimateFrame(w.config, size, w.pricing)));
    }
    expect(JSON.stringify(pricing)).not.toMatch(/labor|supplies|tilePack|material|rounding/);
    expect(() => lookupFrameEstimate(w.config, 999, pricing)).toThrow();
  });
});
