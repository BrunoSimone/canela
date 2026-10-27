import { describe, it, expect } from 'vitest';
import { resumeFrame } from './resume-frame';
import { demoDesignCatalog } from '../infrastructure/demo-catalog';

describe('PER-146: resume a failed purchase', () => {
  it('keeps accepted retouches while applying current geometry and leaving the old order untouched', async () => {
    const design = structuredClone((await demoDesignCatalog.templates())[0].design);
    design.cells[0] = design.config.palette.at(-1)!.id;
    const before = structuredClone(design), config = { ...design.config, version: 'new-config', frameMm: 12 };
    const restored = resumeFrame({ status: 'not_completed', design }, config);
    expect(restored?.design.cells).toEqual(design.cells); expect(restored?.design.config).toEqual(config);
    expect(restored?.published).toBe(false); expect(design).toEqual(before);
  });
  it('never offers a second purchase for a paid, uncertain, missing or incompatible order', async () => {
    const design = (await demoDesignCatalog.templates())[0].design;
    for (const status of ['paid', 'verifying', 'review_required']) expect(resumeFrame({ status, design }, design.config)).toBeNull();
    expect(resumeFrame(null, design.config)).toBeNull();
    expect(resumeFrame({ status: 'not_completed', design }, { ...design.config, minCells: 40 })).toBeNull();
  });
});
